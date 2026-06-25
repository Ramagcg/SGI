from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
import os

from app.database import get_db
from app.models.usuario import Usuario

router = APIRouter()

# ── Config JWT ─────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "sgi-secret-key-cambiar-en-produccion")
ALGORITHM  = "HS256"
EXPIRE_HORAS = 8

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Schemas ────────────────────────────────────────────────────────────────────
class LoginInput(BaseModel):
    email: str
    password: str

class TokenOut(BaseModel):
    access_token: str
    usuario: dict

# ── Helpers ────────────────────────────────────────────────────────────────────
def verificar_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def crear_token(data: dict):
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=EXPIRE_HORAS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# ── Endpoints ──────────────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenOut)
def login(datos: LoginInput, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == datos.email).first()

    if not usuario or not verificar_password(datos.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos"
        )
    if not usuario.activo:
        raise HTTPException(status_code=403, detail="Usuario inactivo")

    token = crear_token({
        "sub": str(usuario.id),
        "email": usuario.email,
        "rol": usuario.rol.nombre if usuario.rol else "Sin rol",
    })

    return {
        "access_token": token,
        "usuario": {
            "id":     usuario.id,
            "nombre": usuario.nombre,
            "email":  usuario.email,
            "rol":    usuario.rol.nombre if usuario.rol else "Sin rol",
        }
    }


@router.post("/seed-admin")
def crear_admin(db: Session = Depends(get_db)):
    """
    Crea el usuario administrador inicial.
    Usalo UNA sola vez desde /docs, después borrá o desactivá este endpoint.
    """
    from app.models.usuario import Rol

    # Crear rol si no existe
    rol = db.query(Rol).filter(Rol.nombre == "Administrador").first()
    if not rol:
        rol = Rol(nombre="Administrador")
        db.add(rol)
        db.flush()

    # Verificar que no exista ya
    if db.query(Usuario).filter(Usuario.email == "admin@sgi.com").first():
        return {"mensaje": "El admin ya existe. Usá admin@sgi.com / admin123"}

    admin = Usuario(
        nombre        = "Administrador",
        email         = "admin@sgi.com",
        password_hash = pwd_context.hash("admin123"),
        rol_id        = rol.id,
        activo        = True,
    )
    db.add(admin)
    db.commit()
    return {"mensaje": "Admin creado. Email: admin@sgi.com / Pass: admin123"}
