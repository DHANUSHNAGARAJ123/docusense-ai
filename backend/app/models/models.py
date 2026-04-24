import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, BigInteger, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy import JSON
from app.core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

class Document(Base):
    __tablename__ = "documents"
    id             = Column(String(36), primary_key=True, default=gen_uuid)
    filename       = Column(String(255), nullable=False)
    file_path      = Column(Text)
    file_type      = Column(String(50))
    document_type  = Column(String(50))
    status         = Column(String(50), default="pending")
    confidence     = Column(Float, default=0.0)
    total_pages    = Column(Integer, default=1)
    file_size      = Column(BigInteger, default=0)
    uploaded_by    = Column(String(100), default="admin")
    uploaded_at    = Column(DateTime, default=datetime.utcnow)
    processed_at   = Column(DateTime, nullable=True)
    processing_time= Column(Float, nullable=True)
    error_message  = Column(Text, nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    extractions    = relationship("Extraction", back_populates="document")
    audit_logs     = relationship("AuditLog", back_populates="document")

class Extraction(Base):
    __tablename__ = "extractions"
    id              = Column(String(36), primary_key=True, default=gen_uuid)
    document_id     = Column(String(36), ForeignKey("documents.id"), nullable=False)
    extracted_data  = Column(JSON)
    raw_ocr_text    = Column(Text)
    layout_analysis = Column(JSON)
    tables          = Column(JSON)
    processing_time = Column(Float, default=0.0)
    model_used      = Column(String(100), default="gemini-1.5-flash")
    cost            = Column(Float, default=0.0)
    created_at      = Column(DateTime, default=datetime.utcnow)
    document          = relationship("Document", back_populates="extractions")
    confidence_scores = relationship("ConfidenceScore", back_populates="extraction")
    reviews           = relationship("Review", back_populates="extraction")

class ConfidenceScore(Base):
    __tablename__ = "confidence_scores"
    id               = Column(String(36), primary_key=True, default=gen_uuid)
    extraction_id    = Column(String(36), ForeignKey("extractions.id"), nullable=False)
    field_name       = Column(String(100))
    field_value      = Column(Text)
    confidence_score = Column(Float, default=0.0)
    ocr_confidence   = Column(Float, default=0.0)
    llm_confidence   = Column(Float, default=0.0)
    validation_score = Column(Float, default=0.0)
    needs_review     = Column(Boolean, default=False)
    bounding_box     = Column(JSON)
    created_at       = Column(DateTime, default=datetime.utcnow)
    extraction = relationship("Extraction", back_populates="confidence_scores")

class Review(Base):
    __tablename__ = "reviews"
    id              = Column(String(36), primary_key=True, default=gen_uuid)
    extraction_id   = Column(String(36), ForeignKey("extractions.id"), nullable=False)
    field_name      = Column(String(100))
    original_value  = Column(Text)
    corrected_value = Column(Text)
    reviewed_by     = Column(String(100), default="admin")
    reviewed_at     = Column(DateTime, default=datetime.utcnow)
    action          = Column(String(50))
    comments        = Column(Text)
    extraction = relationship("Extraction", back_populates="reviews")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id          = Column(String(36), primary_key=True, default=gen_uuid)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=True)
    action      = Column(String(100))
    user        = Column(String(100), default="admin")
    details     = Column(JSON)
    timestamp   = Column(DateTime, default=datetime.utcnow)
    ip_address  = Column(String(50))
    document = relationship("Document", back_populates="audit_logs")