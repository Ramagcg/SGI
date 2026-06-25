from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.cliente import Cliente

router = APIRouter()

class ClienteCreate(BaseModel):
    razon_social: str
    cuit: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None
    lista_precio_id: Optional[int] = None

@router.get("/")
def listar_clientes(db: Session = Depends(get_db)):
    return db.query(Cliente).all()

@router.get("/{id}")
def obtener_cliente(id: int, db: Session = Depends(get_db)):
    return db.query(Cliente).filter(Cliente.id == id).first()

@router.post("/")
def crear_cliente(datos: ClienteCreate, db: Session = Depends(get_db)):
    cliente = Cliente(**datos.model_dump())
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente

@router.put("/{id}")
def editar_cliente(id: int, datos: ClienteCreate, db: Session = Depends(get_db)):
    cliente = db.query(Cliente).filter(Cliente.id == id).first()
    if not cliente:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    for k, v in datos.model_dump().items():
        setattr(cliente, k, v)
    db.commit()
    db.refresh(cliente)
    return cliente