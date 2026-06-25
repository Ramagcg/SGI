from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models.pedido import Pedido, ItemPedido, EstadoPedido
from app.models.producto import Producto
from app.schemas.pedido import PedidoCreate, PedidoOut, PedidoEstadoUpdate
from app.services.stock_service import calcular_stock_virtual, descontar_stock, ESTADOS_VALIDOS

router = APIRouter()


def generar_numero_pedido(db: Session) -> str:
    """Genera el próximo número correlativo: PED-001, PED-002, …"""
    ultimo = db.query(Pedido).order_by(Pedido.id.desc()).first()
    siguiente = (ultimo.id + 1) if ultimo else 1
    return f"PED-{siguiente:03d}"


# ── GET /api/pedidos ───────────────────────────────────────────────────────────
@router.get("/", response_model=List[PedidoOut])
def listar_pedidos(
    estado: str = None,
    cliente_id: int = None,
    db: Session = Depends(get_db),
):
    """Devuelve todos los pedidos. Acepta filtros opcionales por estado y cliente."""
    query = db.query(Pedido)
    if estado:
        query = query.filter(Pedido.estado == estado)
    if cliente_id:
        query = query.filter(Pedido.cliente_id == cliente_id)
    pedidos = query.order_by(Pedido.fecha_pedido.desc()).all()

    # Agrega nombres de cliente y lista para que el frontend no necesite joins
    resultado = []
    for p in pedidos:
        out = PedidoOut.from_orm(p)
        out.cliente_nombre  = p.cliente.razon_social if p.cliente else None
        out.lista_nombre    = p.lista_precio.nombre  if p.lista_precio else None
        for item, item_out in zip(p.items, out.items):
            item_out.producto_nombre = item.producto.nombre if item.producto else None
        resultado.append(out)
    return resultado


# ── GET /api/pedidos/{id} ──────────────────────────────────────────────────────
@router.get("/{pedido_id}", response_model=PedidoOut)
def obtener_pedido(pedido_id: int, db: Session = Depends(get_db)):
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    out = PedidoOut.from_orm(pedido)
    out.cliente_nombre = pedido.cliente.razon_social if pedido.cliente else None
    return out


# ── POST /api/pedidos ──────────────────────────────────────────────────────────
@router.post("/", response_model=PedidoOut, status_code=status.HTTP_201_CREATED)
def crear_pedido(
    datos: PedidoCreate,
    db: Session = Depends(get_db),
    # usuario_actual = Depends(get_current_user),  # ← descomenta al agregar auth
):
    """
    Crea un nuevo pedido. Valida stock de cada producto antes de guardar.
    Si algún producto no tiene stock suficiente, devuelve error 400.
    """
    # 1. Validar stock de todos los items antes de tocar la BD
    for item in datos.items:
        stock_disponible = calcular_stock_virtual(item.producto_id, db)
        if float(item.cantidad) > stock_disponible:
            producto = db.query(Producto).filter(Producto.id == item.producto_id).first()
            nombre = producto.nombre if producto else f"ID {item.producto_id}"
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente para '{nombre}'. "
                       f"Disponible: {stock_disponible}, solicitado: {item.cantidad}."
            )

    # 2. Calcular total
    total = sum(float(i.cantidad) * float(i.precio_unitario) for i in datos.items)

    # 3. Crear el pedido
    nuevo_pedido = Pedido(
        numero          = generar_numero_pedido(db),
        cliente_id      = datos.cliente_id,
        lista_precio_id = datos.lista_precio_id,
        usuario_id      = 1,  # reemplazar por usuario_actual.id al agregar auth
        estado          = "Pendiente",
        total           = total,
        fecha_entrega   = datos.fecha_entrega,
    )
    db.add(nuevo_pedido)
    db.flush()  # obtiene el ID sin hacer commit aún

    # 4. Crear los items
    for item_data in datos.items:
        item = ItemPedido(
            pedido_id       = nuevo_pedido.id,
            producto_id     = item_data.producto_id,
            cantidad        = item_data.cantidad,
            precio_unitario = item_data.precio_unitario,
            subtotal        = float(item_data.cantidad) * float(item_data.precio_unitario),
        )
        db.add(item)

    # 5. Registrar el primer estado en el historial
    estado_inicial = EstadoPedido(
        pedido_id  = nuevo_pedido.id,
        estado     = "Pendiente",
        usuario_id = 1,  # reemplazar al agregar auth
    )
    db.add(estado_inicial)

    db.commit()
    db.refresh(nuevo_pedido)
    return nuevo_pedido


# ── PATCH /api/pedidos/{id}/estado ────────────────────────────────────────────
@router.patch("/{pedido_id}/estado", response_model=PedidoOut)
def cambiar_estado(
    pedido_id: int,
    datos: PedidoEstadoUpdate,
    db: Session = Depends(get_db),
):
    """
    Avanza el estado del pedido. Al pasar a 'En Fabricación', descuenta el stock
    automáticamente de todos los componentes involucrados.
    """
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    if datos.estado not in ESTADOS_VALIDOS:
        raise HTTPException(status_code=400, detail=f"Estado inválido: {datos.estado}")

    estado_anterior = pedido.estado
    pedido.estado = datos.estado

    # Descuenta stock cuando entra a fabricación
    if datos.estado == "En Fabricación" and estado_anterior == "Pendiente":
        for item in pedido.items:
            descontar_stock(item.producto_id, float(item.cantidad), db)

    # Registra el cambio en el historial
    nuevo_estado = EstadoPedido(
        pedido_id   = pedido_id,
        estado      = datos.estado,
        usuario_id  = 1,  # reemplazar al agregar auth
        observacion = datos.observacion,
    )
    db.add(nuevo_estado)

    db.commit()
    db.refresh(pedido)
    return pedido


# ── GET /api/pedidos/monitor/activos ──────────────────────────────────────────
@router.get("/monitor/activos", response_model=List[PedidoOut])
def monitor_produccion(db: Session = Depends(get_db)):
    """Devuelve todos los pedidos activos (excluye Entregados) para el monitor."""
    pedidos = db.query(Pedido).filter(
        Pedido.estado != "Entregado"
    ).order_by(Pedido.fecha_entrega.asc()).all()
    return pedidos
