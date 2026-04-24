# backend/app/api/routes/documents.py
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.models.models import Document, Extraction, ConfidenceScore, AuditLog

logger = logging.getLogger(__name__)
router = APIRouter()


def _doc_dict(doc: Document) -> dict:
    return {
        "id":              doc.id,
        "filename":        doc.filename,
        "file_type":       doc.file_type,
        "file_size":       doc.file_size,
        "document_type":   doc.document_type,
        "status":          doc.status,
        "confidence":      doc.confidence,
        "total_pages":     doc.total_pages,
        "processing_time": doc.processing_time,
        "uploaded_by":     doc.uploaded_by,
        "uploaded_at":     doc.uploaded_at.isoformat() if doc.uploaded_at else None,
        "processed_at":    doc.processed_at.isoformat() if doc.processed_at else None,
        "error_message":   doc.error_message,
    }


@router.get("")
def get_documents(
    status:        Optional[str] = None,
    document_type: Optional[str] = None,
    limit:         int = Query(50, le=200),
    offset:        int = 0,
    user_email:    Optional[str] = Header(None, alias="X-User-Email"),
    db:            Session = Depends(get_db),
):
    q = db.query(Document)
    # ── Per-user filter ──────────────────────────
    if user_email:
        q = q.filter(Document.uploaded_by == user_email)
    # ─────────────────────────────────────────────
    if status:
        q = q.filter(Document.status == status)
    if document_type:
        q = q.filter(Document.document_type == document_type)

    total = q.count()
    docs  = q.order_by(Document.uploaded_at.desc()).offset(offset).limit(limit).all()
    return {"documents": [_doc_dict(d) for d in docs], "total": total}


@router.get("/{doc_id}")
def get_document(
    doc_id:     str,
    user_email: Optional[str] = Header(None, alias="X-User-Email"),
    db:         Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if user_email and doc.uploaded_by != user_email:
        raise HTTPException(status_code=403, detail="Access denied")
    return _doc_dict(doc)


@router.get("/{doc_id}/status")
def get_status(doc_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    all_steps = ["upload", "preprocessing", "ocr", "layout",
                 "llm_extraction", "confidence_scoring", "validation"]

    if doc.status in ("completed", "needs_review"):
        done_steps = all_steps
        current    = "validation"
        progress   = 100
    elif doc.status == "processing":
        done_steps = ["upload", "preprocessing"]
        current    = "ocr"
        progress   = 40
    elif doc.status == "failed":
        done_steps = []
        current    = "upload"
        progress   = 0
    else:
        done_steps = ["upload"]
        current    = "preprocessing"
        progress   = 15

    return {
        "document_id":     doc_id,
        "status":          doc.status,
        "progress":        progress,
        "current_step":    current,
        "steps_completed": done_steps,
        "error":           doc.error_message,
    }


@router.delete("/{doc_id}")
def delete_document(
    doc_id:     str,
    user_email: Optional[str] = Header(None, alias="X-User-Email"),
    db:         Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if user_email and doc.uploaded_by != user_email:
        raise HTTPException(status_code=403, detail="Access denied")

    # Delete related records
    for ext in doc.extractions:
        db.query(ConfidenceScore).filter(
            ConfidenceScore.extraction_id == ext.id
        ).delete()
    db.query(Extraction).filter(Extraction.document_id == doc_id).delete()
    db.query(AuditLog).filter(AuditLog.document_id == doc_id).delete()
    db.delete(doc)
    db.commit()
    return {"success": True}