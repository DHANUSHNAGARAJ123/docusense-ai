# backend/app/api/routes/upload.py
import os, uuid, logging, threading
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Request, Header
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.models.models import Document, AuditLog
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "image/jpeg":      "jpg",
    "image/png":       "png",
    "image/jpg":       "jpg",
}


@router.post("")
async def upload_document(
    request:       Request,
    file:          UploadFile = File(...),
    document_type: str = Form("banking"),
    user_email:    Optional[str] = Header(None, alias="X-User-Email"),
    user_id:       Optional[str] = Header(None, alias="X-User-ID"),
    db:            Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Use PDF, JPG or PNG.")

    file_bytes = await file.read()

    if len(file_bytes) > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 50MB.")
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file.")

    # ── Tag document with uploader identity ──────────────
    current_user = user_email or "anonymous"
    # ─────────────────────────────────────────────────────

    doc_id     = str(uuid.uuid4())
    upload_dir = os.path.join(settings.LOCAL_UPLOAD_DIR, doc_id)
    os.makedirs(upload_dir, exist_ok=True)
    file_path  = os.path.join(upload_dir, file.filename or "document")

    with open(file_path, "wb") as f:
        f.write(file_bytes)

    try:
        doc = Document(
            id=doc_id,
            filename=file.filename or "document",
            file_path=file_path,
            file_type=file.content_type,
            document_type=document_type,
            status="pending",
            file_size=len(file_bytes),
            uploaded_by=current_user,          # ← stored here
            uploaded_at=datetime.utcnow(),
        )
        db.add(doc)

        db.add(AuditLog(
            document_id=doc_id,
            action="uploaded",
            user=current_user,
            details={
                "filename": file.filename,
                "size":     len(file_bytes),
                "type":     document_type,
                "user":     current_user,
            },
            ip_address=request.client.host if request.client else "unknown",
        ))
        db.commit()

        _start_background(doc_id, file_bytes, file.content_type, document_type, current_user)

        return {
            "document_id": doc_id,
            "status":      "processing",
            "message":     "Uploaded successfully",
            "filename":    file.filename,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


def _start_background(doc_id, file_bytes, file_type, doc_type, user):
    def process():
        from app.core.database import SessionLocal
        from app.services.orchestrator import run_processing_pipeline
        db2 = SessionLocal()
        try:
            run_processing_pipeline(doc_id, file_bytes, file_type, doc_type, db2)
        except Exception as e:
            logger.error(f"Background processing failed [{doc_id}]: {e}", exc_info=True)
        finally:
            db2.close()
    threading.Thread(target=process, daemon=True).start()