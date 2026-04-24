import logging, os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import create_tables
from fastapi.responses import FileResponse
import os

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting DocuSense AI Backend...")
    create_tables()
    os.makedirs(settings.LOCAL_UPLOAD_DIR, exist_ok=True)
    if settings.TESSERACT_CMD:
        import pytesseract
        pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
    logger.info("✅ DocuSense AI Backend started!")
    yield
    logger.info("Shutting down...")

app = FastAPI(
    title="DocuSense AI API",
    description="Multimodal Document Intake System",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

os.makedirs("./uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="./uploads"), name="uploads")

from app.api.routes.upload    import router as upload_router
from app.api.routes.documents import router as documents_router
from app.api.routes.extraction import router as extraction_router
from app.api.routes.review    import router as review_router
from app.api.routes.audit     import router as audit_router
from app.api.routes.stats     import router as stats_router

app.include_router(upload_router,     prefix="/api/upload",     tags=["Upload"])
app.include_router(documents_router,  prefix="/api/documents",  tags=["Documents"])
app.include_router(extraction_router, prefix="/api/extractions",tags=["Extractions"])
app.include_router(review_router,     prefix="/api/review",     tags=["Review"])
app.include_router(audit_router,      prefix="/api/audit",      tags=["Audit"])
app.include_router(stats_router,      prefix="/api/stats",      tags=["Stats"])

@app.get("/")
def root(): return {"message": "DocuSense AI is running! 🚀", "docs": "/api/docs"}

@app.get("/health")
def health(): return {"status": "ok", "version": "1.0.0"}



@app.get("/api/documents/{doc_id}/file")
def serve_document_file(doc_id: str, db=None):
    from app.core.database import SessionLocal
    from app.models.models import Document
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc or not doc.file_path:
            raise HTTPException(status_code=404, detail="File not found")
        if not os.path.exists(doc.file_path):
            raise HTTPException(status_code=404, detail="File not on disk")
        return FileResponse(
            doc.file_path,
            media_type=doc.file_type or "application/octet-stream",
            filename=doc.filename,
        )
    finally:
        db.close()