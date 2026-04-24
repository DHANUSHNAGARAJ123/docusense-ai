# backend/app/api/routes/stats.py
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from app.core.database import get_db
from app.models.models import Document, Extraction

router = APIRouter()


@router.get("")
def get_stats(
    user_email: Optional[str] = Header(None, alias="X-User-Email"),
    db: Session = Depends(get_db),
):
    # ── Per-user filter ──────────────────────────
    q = db.query(Document)
    if user_email:
        q = q.filter(Document.uploaded_by == user_email)
    # ─────────────────────────────────────────────

    total         = q.count()
    completed     = q.filter(Document.status == "completed").count()
    needs_review  = q.filter(Document.status == "needs_review").count()
    processing    = q.filter(Document.status == "processing").count()
    failed        = q.filter(Document.status == "failed").count()

    # Re-query for avg confidence (only completed/needs_review)
    q2 = db.query(Document)
    if user_email:
        q2 = q2.filter(Document.uploaded_by == user_email)
    conf_docs  = q2.filter(Document.confidence.isnot(None)).all()
    avg_conf   = (
        sum(d.confidence for d in conf_docs) / len(conf_docs)
        if conf_docs else 0.0
    )

    # By document type
    q3 = db.query(Document)
    if user_email:
        q3 = q3.filter(Document.uploaded_by == user_email)
    all_docs = q3.all()

    by_type: dict = {}
    for d in all_docs:
        dt = d.document_type or "unknown"
        by_type[dt] = by_type.get(dt, 0) + 1

    # Recent activity (last 7 days)
    from datetime import datetime, timedelta
    week_ago = datetime.utcnow() - timedelta(days=7)
    q4 = db.query(Document)
    if user_email:
        q4 = q4.filter(Document.uploaded_by == user_email)
    recent = q4.filter(Document.uploaded_at >= week_ago).count()

    # Avg processing time
    q5 = db.query(Document)
    if user_email:
        q5 = q5.filter(Document.uploaded_by == user_email)
    timed_docs = q5.filter(Document.processing_time.isnot(None)).all()
    avg_time   = (
        sum(d.processing_time for d in timed_docs) / len(timed_docs)
        if timed_docs else 0.0
    )

    return {
        "total_documents":    total,
        "completed":          completed,
        "needs_review":       needs_review,
        "processing":         processing,
        "failed":             failed,
        "avg_confidence":     round(avg_conf, 1),
        "by_document_type":   by_type,
        "recent_uploads":     recent,
        "avg_processing_time": round(avg_time, 1),
    }