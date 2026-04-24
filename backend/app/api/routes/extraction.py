import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Extraction, ConfidenceScore, Document

router = APIRouter()

@router.get("/{document_id}")
def get_extraction(document_id: str, db: Session = Depends(get_db)):
    ext = db.query(Extraction).filter(
        Extraction.document_id == document_id
    ).order_by(Extraction.created_at.desc()).first()

    if not ext:
        raise HTTPException(status_code=404, detail="Extraction not found. Still processing?")

    scores = db.query(ConfidenceScore).filter(
        ConfidenceScore.extraction_id == ext.id
    ).all()

    return {
        "id": ext.id,
        "document_id": ext.document_id,
        "extracted_data": ext.extracted_data,
        "raw_ocr_text": ext.raw_ocr_text,
        "tables": ext.tables or [],
        "processing_time": ext.processing_time,
        "model_used": ext.model_used,
        "confidence_scores": [
            {
                "field_name": s.field_name,
                "field_value": s.field_value,
                "confidence_score": s.confidence_score,
                "ocr_confidence": s.ocr_confidence,
                "llm_confidence": s.llm_confidence,
                "validation_score": s.validation_score,
                "needs_review": s.needs_review,
                "bounding_box": s.bounding_box,
            }
            for s in scores
        ],
        "created_at": ext.created_at.isoformat() if ext.created_at else None,
    }