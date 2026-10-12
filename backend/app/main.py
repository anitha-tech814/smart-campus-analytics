from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import engine, Base, SessionLocal, ensure_schema
from app.services.data_service import seed_database_with_demo_data
from app.api.routes_students import router as students_router
from app.api.routes_analytics import router as analytics_router
from app.api.routes_assistant import router as assistant_router
from app.api.routes_config import router as config_router
from app.api.routes_interventions import router as interventions_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    # Additively migrate the schema for optional future-compatible dimensions
    ensure_schema()
    
    # Auto-seed initial demo dataset if database is empty
    db = SessionLocal()
    try:
        count = seed_database_with_demo_data(db, force=False)
        print(f"[Smart Campus Analytics] Initialized database with {count} student records.")
    finally:
        db.close()

    # Build/refresh the local RAG index (change-aware, persistent). Wrapped so a
    # failure can never prevent the API from starting.
    try:
        from app.services.rag import indexer
        summary = indexer.ensure_index()
        print(
            f"[Smart Campus Analytics] RAG index {summary.get('status')} "
            f"({summary.get('chunk_count', 0)} chunks, {summary.get('document_count', 0)} documents)."
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[Smart Campus Analytics] RAG index initialization skipped: {exc}")

    yield

app = FastAPI(
    title="Smart Campus Analytics API",
    description="Local AI-powered Student Success and Risk Detection Platform",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for web interfaces (local, Netlify, Vercel, and cloud deployments)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(students_router)
app.include_router(analytics_router)
app.include_router(assistant_router)
app.include_router(config_router)
app.include_router(interventions_router)

import os
from fastapi import HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "Smart Campus Analytics"}

# Serve pre-built frontend distribution if present (full-stack single URL deployment)
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.isdir(FRONTEND_DIST):
    assets_path = os.path.join(FRONTEND_DIST, "assets")
    if os.path.isdir(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

    @app.get("/")
    def serve_root():
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        return {"status": "Online", "app": "Smart Campus Analytics"}

    @app.get("/{full_path:path}")
    def serve_frontend_spa(full_path: str):
        # Never swallow API routes or OpenAPI endpoints
        if full_path.startswith("api/") or full_path == "api" or full_path.startswith("docs") or full_path == "openapi.json":
            raise HTTPException(status_code=404, detail="API route not found")
        candidate = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "app": "Smart Campus Analytics",
            "status": "Online",
            "documentation": "/docs",
            "privacy": "Local-first: analytics and retrieval run on-premise."
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
