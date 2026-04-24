# backend/app/api/routes/review.py
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.models.models import Document, Extraction, Review, AuditLog, ConfidenceScore

router = APIRouter()


class CorrectionRequest(BaseModel):
    field_name: str
    corrected_value: str
    comments: Optional[str] = None


@router.get("/queue")
def get_queue(
    user_email: Optional[str] = Header(None, alias="X-User-Email"),
    user_id:    Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db),
):
    q = db.query(Document)

    # ── Per-user filter ──────────────────────────────────────
    if user_email:
        q = q.filter(Document.uploaded_by == user_email)
    # ─────────────────────────────────────────────────────────

    docs = q.order_by(Document.uploaded_at.desc()).limit(200).all()

    result = []
    for d in docs:
        # Get confidence scores for this document
        ext = (
            db.query(Extraction)
            .filter(Extraction.document_id == d.id)
            .order_by(Extraction.created_at.desc())
            .first()
        )
        scores = []
        if ext:
            raw_scores = (
                db.query(ConfidenceScore)
                .filter(ConfidenceScore.extraction_id == ext.id)
                .all()
            )
            scores = [
                {
                    "field_name":       s.field_name,
                    "field_value":      s.field_value,
                    "confidence_score": s.confidence_score,
                    "ocr_confidence":   s.ocr_confidence,
                    "llm_confidence":   s.llm_confidence,
                    "validation_score": s.validation_score,
                    "needs_review":     s.needs_review,
                }
                for s in raw_scores
            ]

        result.append({
            "id":            d.id,
            "filename":      d.filename,
            "document_type": d.document_type,
            "status":        d.status,
            "confidence":    d.confidence,
            "uploaded_by":   d.uploaded_by,
            "uploaded_at":   d.uploaded_at.isoformat() if d.uploaded_at else None,
            "processed_at":  d.processed_at.isoformat() if d.processed_at else None,
            "confidence_scores": scores,
        })

    return {"documents": result}


@router.post("/{doc_id}/approve")
def approve(
    doc_id: str,
    user_email: Optional[str] = Header(None, alias="X-User-Email"),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if user_email and doc.uploaded_by != user_email:
        raise HTTPException(status_code=403, detail="Access denied")
    doc.status = "completed"
    db.add(AuditLog(
        document_id=doc_id,
        action="approved",
        user=user_email or "admin",
        details={"method": "manual"},
    ))
    db.commit()
    return {"success": True}


@router.post("/{doc_id}/correct")
def correct(
    doc_id: str,
    correction: CorrectionRequest,
    user_email: Optional[str] = Header(None, alias="X-User-Email"),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if user_email and doc.uploaded_by != user_email:
        raise HTTPException(status_code=403, detail="Access denied")

    ext = (
        db.query(Extraction)
        .filter(Extraction.document_id == doc_id)
        .order_by(Extraction.created_at.desc())
        .first()
    )
    if not ext:
        raise HTTPException(status_code=404, detail="No extraction found")

    original = str((ext.extracted_data or {}).get(correction.field_name, ""))
    data = dict(ext.extracted_data or {})
    data[correction.field_name] = correction.corrected_value
    ext.extracted_data = data

    db.add(Review(
        extraction_id=ext.id,
        field_name=correction.field_name,
        original_value=original,
        corrected_value=correction.corrected_value,
        reviewed_by=user_email or "admin",
        reviewed_at=datetime.utcnow(),
        action="corrected",
        comments=correction.comments,
    ))
    db.add(AuditLog(
        document_id=doc_id,
        action="corrected",
        user=user_email or "admin",
        details={
            "field":     correction.field_name,
            "original":  original,
            "corrected": correction.corrected_value,
        },
    ))
    db.commit()
    return {"success": True}