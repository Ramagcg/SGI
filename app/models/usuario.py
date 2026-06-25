from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Rol(Base):
    __tablename__ = "roles"

    id       = Column(Integer, primary_key=True, index=True)
    nombre   = Column(String(50), unique=True, nullable=False)  # Vendedor, Almacén, etc.

    usuarios = relationship("Usuario", back_populates="rol")


class Usuario(Base):
    __tablename__ = "usuarios"

    id             = Column(Integer, primary_key=True, index=True)
    nombre         = Column(String(100), nullable=False)
    email          = Column(String(150), unique=True, nullable=False)
    password_hash  = Column(String(255), nullable=False)
    rol_id         = Column(Integer, ForeignKey("roles.id"), nullable=True)
    activo         = Column(Boolean, default=True)
    creado_en      = Column(DateTime(timezone=True), server_default=func.now())

    rol            = relationship("Rol", back_populates="usuarios")
    pedidos        = relationship("Pedido", back_populates="usuario")
    estados_pedido = relationship("EstadoPedido", back_populates="usuario")
