from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Pedido(Base):
    __tablename__ = "pedidos"

    id             = Column(Integer, primary_key=True, index=True)
    numero         = Column(String(20), unique=True, nullable=False)  # PED-001
    cliente_id     = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    lista_precio_id= Column(Integer, ForeignKey("listas_precio.id"), nullable=False)
    usuario_id     = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    estado         = Column(String(50), default="Pendiente")
    total          = Column(Numeric(12, 2), default=0)
    fecha_pedido   = Column(DateTime(timezone=True), server_default=func.now())
    fecha_entrega  = Column(DateTime(timezone=True), nullable=True)

    # Relaciones
    cliente        = relationship("Cliente",     back_populates="pedidos")
    lista_precio   = relationship("ListaPrecio", back_populates="pedidos")
    usuario        = relationship("Usuario",     back_populates="pedidos")
    items          = relationship("ItemPedido",  back_populates="pedido", cascade="all, delete-orphan")
    estados        = relationship("EstadoPedido",back_populates="pedido", order_by="EstadoPedido.fecha")


class ItemPedido(Base):
    __tablename__ = "items_pedido"

    id             = Column(Integer, primary_key=True, index=True)
    pedido_id      = Column(Integer, ForeignKey("pedidos.id"), nullable=False)
    producto_id    = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad       = Column(Numeric(10, 2), nullable=False)
    precio_unitario= Column(Numeric(12, 2), nullable=False)
    subtotal       = Column(Numeric(12, 2), nullable=False)

    pedido         = relationship("Pedido",   back_populates="items")
    producto       = relationship("Producto", back_populates="items_pedido")


class EstadoPedido(Base):
    __tablename__ = "estados_pedido"

    id          = Column(Integer, primary_key=True, index=True)
    pedido_id   = Column(Integer, ForeignKey("pedidos.id"), nullable=False)
    estado      = Column(String(50), nullable=False)
    usuario_id  = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    observacion = Column(Text, nullable=True)
    fecha       = Column(DateTime(timezone=True), server_default=func.now())

    pedido      = relationship("Pedido",  back_populates="estados")
    usuario     = relationship("Usuario", back_populates="estados_pedido")
