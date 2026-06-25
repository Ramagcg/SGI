from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

# ── Items ──────────────────────────────────────────────────────────────────────

class ItemPedidoCreate(BaseModel):
    producto_id:    int
    cantidad:       Decimal
    precio_unitario: Decimal

class ItemPedidoOut(BaseModel):
    id:             int
    producto_id:    int
    producto_nombre: Optional[str] = None
    cantidad:       Decimal
    precio_unitario: Decimal
    subtotal:       Decimal

    class Config:
        from_attributes = True

# ── Pedido ─────────────────────────────────────────────────────────────────────

class PedidoCreate(BaseModel):
    cliente_id:      int
    lista_precio_id: int
    fecha_entrega:   Optional[datetime] = None
    items:           List[ItemPedidoCreate]

class PedidoOut(BaseModel):
    id:              int
    numero:          str
    cliente_id:      int
    cliente_nombre:  Optional[str] = None
    lista_precio_id: int
    lista_nombre:    Optional[str] = None
    estado:          str
    total:           Decimal
    fecha_pedido:    datetime
    fecha_entrega:   Optional[datetime]
    items:           List[ItemPedidoOut] = []

    class Config:
        from_attributes = True

class PedidoEstadoUpdate(BaseModel):
    estado:      str
    observacion: Optional[str] = None
