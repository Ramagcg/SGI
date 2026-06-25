from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
# Importar todos los modelos para que SQLAlchemy los registre
from app.models import usuario, cliente, producto, pedido  # noqa: F401
from app.routers import pedidos, productos, clientes, usuarios, auth
from app.routers import listas_precio
# Crea las tablas si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SGI - Sistema de Gestión Integrado",
    description="API para la gestión de pedidos, stock y clientes de una empresa metalúrgica.",
    version="1.0.0",
)

# Permite que el frontend en React (localhost:3000 o Vercel) se comunique con la API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://sgi-metalurgica.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registra todos los routers con su prefijo
app.include_router(auth.router,      prefix="/api/auth",      tags=["Auth"])
app.include_router(usuarios.router,  prefix="/api/usuarios",  tags=["Usuarios"])
app.include_router(clientes.router,  prefix="/api/clientes",  tags=["Clientes"])
app.include_router(productos.router, prefix="/api/productos", tags=["Productos"])
app.include_router(pedidos.router,   prefix="/api/pedidos",   tags=["Pedidos"])

@app.get("/")
def root():
    return {"mensaje": "API SGI funcionando", "docs": "/docs"}

from app.routers import listas_precio
# y más abajo:
app.include_router(listas_precio.router, prefix="/api/listas-precio", tags=["Listas de Precio"])
