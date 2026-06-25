from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.usuario import Rol, Usuario
from app.routers.auth import pwd_context

router = APIRouter()


class UsuarioCreate(BaseModel):
    nombre: str
    email: EmailStr
    password: str
    rol: str = "Consulta"
    activo: bool = True


class UsuarioUpdate(BaseModel):
    nombre: str
    email: EmailStr
    password: Optional[str] = None
    rol: str = "Consulta"
    activo: bool = True


class UsuarioEstadoUpdate(BaseModel):
    activo: bool


def obtener_o_crear_rol(nombre: str, db: Session):
    rol_nombre = (nombre or "Consulta").strip()
    rol = db.query(Rol).filter(Rol.nombre == rol_nombre).first()
    if rol:
        return rol

    rol = Rol(nombre=rol_nombre)
    db.add(rol)
    db.flush()
    return rol


def usuario_out(usuario: Usuario):
    return {
        "id": usuario.id,
        "nombre": usuario.nombre,
        "email": usuario.email,
        "rol": usuario.rol.nombre if usuario.rol else "Sin rol",
        "activo": usuario.activo,
        "creado_en": usuario.creado_en,
    }


@router.get("/")
def listar_usuarios(db: Session = Depends(get_db)):
    usuarios = db.query(Usuario).order_by(Usuario.id.desc()).all()
    return [usuario_out(usuario) for usuario in usuarios]


@router.get("/roles")
def listar_roles(db: Session = Depends(get_db)):
    roles = db.query(Rol).order_by(Rol.nombre.asc()).all()
    return roles


@router.get("/{id}")
def obtener_usuario(id: int, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario_out(usuario)


@router.post("/")
def crear_usuario(datos: UsuarioCreate, db: Session = Depends(get_db)):
    existe = db.query(Usuario).filter(Usuario.email == datos.email).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe un usuario con ese email")

    rol = obtener_o_crear_rol(datos.rol, db)
    usuario = Usuario(
        nombre=datos.nombre,
        email=datos.email,
        password_hash=pwd_context.hash(datos.password),
        rol_id=rol.id,
        activo=datos.activo,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario_out(usuario)


@router.put("/{id}")
def editar_usuario(id: int, datos: UsuarioUpdate, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    email_usado = db.query(Usuario).filter(
        Usuario.email == datos.email,
        Usuario.id != id,
    ).first()
    if email_usado:
        raise HTTPException(status_code=400, detail="Ya existe otro usuario con ese email")

    rol = obtener_o_crear_rol(datos.rol, db)
    usuario.nombre = datos.nombre
    usuario.email = datos.email
    usuario.rol_id = rol.id
    usuario.activo = datos.activo
    if datos.password:
        usuario.password_hash = pwd_context.hash(datos.password)

    db.commit()
    db.refresh(usuario)
    return usuario_out(usuario)


@router.patch("/{id}/estado")
def cambiar_estado_usuario(id: int, datos: UsuarioEstadoUpdate, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id == id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    usuario.activo = datos.activo
    db.commit()
    db.refresh(usuario)
    return usuario_out(usuario)
