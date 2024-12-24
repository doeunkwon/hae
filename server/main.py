from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.v1.endpoints import networks, query
from database.db import Base, engine

# FastAPI app instance
app = FastAPI(
    title="FastAPI Backend",
    description="A medium scale backend application with SQLite and Firebase Auth",
    version="1.0.0"
)

# Configure CORS
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(
    networks.router, prefix="/api/v1/networks", tags=["networks"])
app.include_router(query.router, prefix="/api/v1", tags=["query"])

# Basic health check endpoint


@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "Service is running"}

# Create database tables


def init_db():
    Base.metadata.create_all(bind=engine)

# Startup event


@app.on_event("startup")
async def startup_event():
    init_db()
