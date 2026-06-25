from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Producto(Base):
    __tablename__ = "productos"

    id              = Column(Integer, primary_key=True, index=True)
    codigo          = Column(String(50), unique=True, nullable=False)
    nombre          = Column(String(200), nullable=False)
    tipo            = Column(String(20), default="simple")  # simple | compuesto
    stock_actual    = Column(Numeric(10, 2), default=0)
    stock_minimo    = Column(Numeric(10, 2), default=0)
    unidad          = Column(String(20), default="unidad")  # unidad, metro, kg...
    actualizado_en  = Column(DateTime(timezone=True), onupdate=func.now())

    componentes     = relationship("ComponenteProducto", foreign_keys="ComponenteProducto.producto_padre_id", back_populates="producto_padre")
    items_pedido    = relationship("ItemPedido", back_populates="producto")


class ComponenteProducto(Base):
    __tablename__ = "componentes_producto"

    id                  = Column(Integer, primary_key=True, index=True)
    producto_padre_id   = Column(Integer, ForeignKey("productos.id"), nullable=False)
    componente_id       = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad_requerida  = Column(Numeric(10, 2), nullable=False)

    producto_padre      = relationship("Producto", foreign_keys=[producto_padre_id], back_populates="componentes")
    componente          = relationship("Producto", foreign_keys=[componente_id])
