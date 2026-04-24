# backend/app/api/routes/audit.py
from fastapi import APIRouter, Depends, Query, Header
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.models.models import AuditLog, Document

router = APIRouter()


@router.get("")
def get_audit_logs(
    document_id: Optional[str] = None,
    limit:       int = Query(100, le=500),
    offset:      int = 0,
    user_email:  Optional[str] = Header(None, alias="X-User-Email"),
    db:          Session = Depends(get_db),
):
    q = db.query(AuditLog)

    if document_id:
        q = q.filter(AuditLog.document_id == document_id)
    elif user_email:
        # ── Per-user filter: only logs for THIS user's documents ──
        user_doc_ids = (
            db.query(Document.id)
            .filter(Document.uploaded_by == user_email)
            .all()
        )
        ids = [r[0] for r in user_doc_ids]
        if ids:
            q = q.filter(AuditLog.document_id.in_(ids))
        else:
            # User has no documents — return empty
            return {"logs": [], "total": 0}
        # ─────────────────────────────────────────────────────────

    total = q.count()
    logs  = q.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "logs": [
            {
                "id":          log.id,
                "document_id": log.document_id,
                "action":      log.action,
                "user":        log.user,
                "details":     log.details,
                "ip_address":  log.ip_address,
                "created_at":  log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
        "total": total,
    }