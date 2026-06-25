from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.cliente import ListaPrecio

router = APIRouter()

class ListaCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

@router.get("/")
def listar_listas(db: Session = Depends(get_db)):
    return db.query(ListaPrecio).all()

@router.post("/")
def crear_lista(datos: ListaCreate, db: Session = Depends(get_db)):
    lista = ListaPrecio(nombre=datos.nombre, descripcion=datos.descripcion)
    db.add(lista)
    db.commit()
    db.refresh(lista)
    return lista