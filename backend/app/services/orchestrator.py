# backend/app/services/orchestrator.py
import logging
import time
from datetime import datetime
from typing import Dict, Optional
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def run_processing_pipeline(
    document_id: str,
    file_bytes: bytes,
    file_type: str,
    document_type: str,
    db: Session,
) -> Dict:
    from app.models.models import Document, Extraction, ConfidenceScore, AuditLog
    from app.services.preprocessing.pdf_processor import extract_text_from_pdf, convert_pdf_to_images
    from app.services.extraction.llm_extractor import extract_with_gemini_multimodal
    from app.services.confidence.scorer import calculate_confidence_scores, get_overall_confidence

    t0 = time.time()
    logger.info(f"[{document_id}] START | type={document_type} | size={len(file_bytes)}")

    def update_doc(**kwargs):
        try:
            doc = db.query(Document).filter(Document.id == document_id).first()
            if doc:
                for k, v in kwargs.items():
                    setattr(doc, k, v)
                db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"update_doc error: {e}")

    try:
        update_doc(status="processing")

        is_pdf = file_type in ("application/pdf", "pdf")
        ocr_text = ""
        image_bytes: Optional[bytes] = None

        if is_pdf:
            # Step 1: Direct text extraction
            logger.info(f"[{document_id}] Extracting PDF text...")
            ocr_text = extract_text_from_pdf(file_bytes)
            logger.info(f"[{document_id}] Text extracted: {len(ocr_text)} chars")

            # Step 2: Convert first page to image for Vision API
            logger.info(f"[{document_id}] Converting PDF to image...")
            images = convert_pdf_to_images(file_bytes, dpi=150)
            if images:
                image_bytes = images[0]
                logger.info(f"[{document_id}] Image ready: {len(image_bytes)} bytes")
            else:
                logger.warning(f"[{document_id}] PDF to image failed")
        else:
            # Image file
            image_bytes = file_bytes
            logger.info(f"[{document_id}] Image file: {len(file_bytes)} bytes")

        # Step 3: Gemini extraction (Vision preferred)
        logger.info(f"[{document_id}] Starting Gemini extraction...")
        extracted_data = extract_with_gemini_multimodal(
            text=ocr_text,
            document_type=document_type,
            image_bytes=image_bytes,
        )
        logger.info(f"[{document_id}] Extracted data: {extracted_data}")

        # Step 4: Confidence scoring
        ocr_confidence = 85.0 if len(ocr_text) > 100 else 65.0
        scores = calculate_confidence_scores(extracted_data, ocr_confidence, document_type)
        overall = get_overall_confidence(scores)
        needs_review = overall < 75.0
        proc_time = round(time.time() - t0, 2)

        # Step 5: Save extraction to DB
        extraction = Extraction(
            document_id=document_id,
            extracted_data=extracted_data,
            raw_ocr_text=ocr_text,
            tables=_get_tables(extracted_data),
            processing_time=proc_time,
            model_used="gemini-2.5-flash",
        )
        db.add(extraction)
        db.flush()

        for s in scores:
            db.add(ConfidenceScore(
                extraction_id=extraction.id,
                field_name=s["field_name"],
                field_value=str(s["field_value"]) if s["field_value"] is not None else "",
                confidence_score=s["confidence_score"],
                ocr_confidence=s["ocr_confidence"],
                llm_confidence=s["llm_confidence"],
                validation_score=s["validation_score"],
                needs_review=s["needs_review"],
            ))

        final_status = "needs_review" if needs_review else "completed"
        update_doc(
            status=final_status,
            confidence=overall,
            processed_at=datetime.utcnow(),
            processing_time=proc_time,
        )

        db.add(AuditLog(
            document_id=document_id,
            action="extraction_completed",
            user="system",
            details={
                "confidence": overall,
                "needs_review": needs_review,
                "ocr_chars": len(ocr_text),
                "time": proc_time,
            },
        ))
        db.commit()

        logger.info(f"[{document_id}] ✅ DONE! status={final_status} confidence={overall:.1f}% time={proc_time}s")
        return {"success": True, "document_id": document_id, "confidence": overall}

    except Exception as e:
        logger.error(f"[{document_id}] ❌ FAILED: {e}", exc_info=True)
        try:
            update_doc(status="failed", error_message=str(e))
        except:
            pass
        raise


def _get_tables(data: dict) -> list:
    tables = []
    if isinstance(data.get("transactions"), list) and data["transactions"]:
        tables.append({"type": "transactions", "rows": data["transactions"]})
    if isinstance(data.get("items"), list) and data["items"]:
        tables.append({"type": "line_items", "rows": data["items"]})
    return tables