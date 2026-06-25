from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from app.database import get_db
from app.models.producto import Producto

router = APIRouter()

class ProductoCreate(BaseModel):
    codigo: str
    nombre: str
    tipo: str = "simple"
    stock_actual: Decimal = 0
    stock_minimo: Decimal = 0
    unidad: str = "unidad"

@router.get("/")
def listar_productos(db: Session = Depends(get_db)):
    return db.query(Producto).all()

@router.get("/{id}")
def obtener_producto(id: int, db: Session = Depends(get_db)):
    return db.query(Producto).filter(Producto.id == id).first()

@router.get("/{id}/stock-virtual")
def stock_virtual(id: int, db: Session = Depends(get_db)):
    from app.services.stock_service import calcular_stock_virtual
    return { "producto_id": id, "stock_disponible": calcular_stock_virtual(id, db) }

@router.post("/")
def crear_producto(datos: ProductoCreate, db: Session = Depends(get_db)):
    producto = Producto(**datos.model_dump())
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto