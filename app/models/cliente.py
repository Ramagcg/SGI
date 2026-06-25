from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ListaPrecio(Base):
    __tablename__ = "listas_precio"

    id          = Column(Integer, primary_key=True, index=True)
    nombre      = Column(String(100), nullable=False)  # Mayorista, Minorista, Especial
    descripcion = Column(String(255), nullable=True)

    clientes    = relationship("Cliente", back_populates="lista_precio")
    pedidos     = relationship("Pedido",  back_populates="lista_precio")


class Cliente(Base):
    __tablename__ = "clientes"

    id              = Column(Integer, primary_key=True, index=True)
    razon_social    = Column(String(200), nullable=False)
    cuit            = Column(String(20),  unique=True, nullable=True)
    telefono        = Column(String(50),  nullable=True)
    email           = Column(String(150), nullable=True)
    direccion       = Column(String(300), nullable=True)
    lista_precio_id = Column(Integer, ForeignKey("listas_precio.id"), nullable=True)
    deuda_total     = Column(Numeric(12, 2), default=0)
    creado_en       = Column(DateTime(timezone=True), server_default=func.now())

    lista_precio    = relationship("ListaPrecio", back_populates="clientes")
    pedidos         = relationship("Pedido", back_populates="cliente")
