from sqlalchemy.orm import Session
from app.models.producto import Producto, ComponenteProducto

ESTADOS_VALIDOS = [
    "Pendiente",
    "En Fabricación",
    "Control de Calidad",
    "Listo para Retirar",
    "Entregado",
]

def calcular_stock_virtual(producto_id: int, db: Session) -> float:
    """
    Para productos compuestos (kits), calcula cuántas unidades se pueden
    ensamblar según el stock disponible de cada componente.

    Fórmula: MIN(stock_componente / cantidad_requerida) para todos los componentes.
    Para productos simples devuelve el stock_actual directamente.
    """
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        return 0

    componentes = db.query(ComponenteProducto).filter(
        ComponenteProducto.producto_padre_id == producto_id
    ).all()

    # Producto simple: devuelve stock real
    if not componentes:
        return float(producto.stock_actual)

    # Producto compuesto: calcula el mínimo ensamblable
    cantidades_posibles = []
    for comp in componentes:
        componente = db.query(Producto).filter(Producto.id == comp.componente_id).first()
        if not componente or comp.cantidad_requerida <= 0:
            return 0
        posibles = float(componente.stock_actual) / float(comp.cantidad_requerida)
        cantidades_posibles.append(posibles)

    return int(min(cantidades_posibles)) if cantidades_posibles else 0


def descontar_stock(producto_id: int, cantidad: float, db: Session):
    """
    Descuenta stock al confirmar un pedido.
    Para productos compuestos descuenta de cada componente proporcionalmente.
    """
    componentes = db.query(ComponenteProducto).filter(
        ComponenteProducto.producto_padre_id == producto_id
    ).all()

    if not componentes:
        # Producto simple: descuento directo
        producto = db.query(Producto).filter(Producto.id == producto_id).first()
        if producto:
            producto.stock_actual -= cantidad
    else:
        # Producto compuesto: descuenta de cada componente
        for comp in componentes:
            componente = db.query(Producto).filter(Producto.id == comp.componente_id).first()
            if componente:
                componente.stock_actual -= (cantidad * float(comp.cantidad_requerida))
