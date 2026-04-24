# backend/app/services/extraction/llm_extractor.py
import json
import re
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

PROMPTS = {
    "banking": """Extract ALL data from this bank statement. Return ONLY valid JSON, no explanation, no markdown.

{
  "bank_name": "bank name or null",
  "branch_name": "branch name or null",
  "account_number": "account number",
  "account_type": "savings/current/salary/checking or null",
  "account_holder": "full name",
  "ifsc_code": "IFSC or routing code or null",
  "statement_period_start": "YYYY-MM-DD",
  "statement_period_end": "YYYY-MM-DD",
  "opening_balance": 0.0,
  "closing_balance": 0.0,
  "total_deposits": 0.0,
  "total_withdrawals": 0.0,
  "average_balance": null,
  "interest_earned": null,
  "service_charges": null,
  "transactions": [
    {"date": "YYYY-MM-DD", "description": "text", "debit": null, "credit": null, "balance": null}
  ]
}

Rules:
- Extract EVERY transaction visible
- Amounts as plain numbers, no $ or commas
- Dates as YYYY-MM-DD, guess year from context
- null only if truly missing""",

    "insurance": """Extract ALL data from this insurance document. Return ONLY valid JSON, no markdown.

{
  "policy_number": "...",
  "claim_number": "...",
  "claimant_name": "...",
  "date_of_birth": null,
  "contact_number": null,
  "claim_date": "YYYY-MM-DD",
  "incident_date": "YYYY-MM-DD",
  "incident_description": "...",
  "claim_type": "health/vehicle/property/life/other",
  "claim_amount": 0.0,
  "approved_amount": null,
  "insurer_name": null,
  "policy_type": "...",
  "sum_insured": null,
  "premium_amount": null,
  "hospital_name": null,
  "vehicle_number": null,
  "diagnosis": null,
  "agent_name": null
}""",

    "invoice": """Extract ALL data from this invoice. Return ONLY valid JSON, no markdown.

{
  "invoice_number": "...",
  "invoice_date": "YYYY-MM-DD",
  "due_date": null,
  "payment_terms": null,
  "po_number": null,
  "vendor_name": "...",
  "vendor_address": "...",
  "vendor_gst": null,
  "vendor_bank": null,
  "customer_name": "...",
  "customer_address": "...",
  "shipping_address": null,
  "items": [{"description": "...", "quantity": 1, "unit_price": 0.0, "total": 0.0}],
  "subtotal": 0.0,
  "discount_amount": 0.0,
  "tax_rate": 0.0,
  "tax_amount": 0.0,
  "total_amount": 0.0,
  "currency": "USD",
  "notes": null
}"""
}


def extract_with_gemini_multimodal(
    text: str,
    document_type: str,
    image_bytes: Optional[bytes] = None,
) -> Dict[str, Any]:
    try:
        from google import genai
        from app.core.config import settings

        if not settings.GEMINI_API_KEY:
            logger.error("No GEMINI_API_KEY in .env!")
            return _empty(document_type)

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        prompt = PROMPTS.get(document_type, PROMPTS["banking"])
        contents = []

        # VISION mode — most accurate (use image if available)
        if image_bytes and len(image_bytes) > 500:
            try:
                import PIL.Image
                import io as _io
                pil_img = PIL.Image.open(_io.BytesIO(image_bytes))
                if pil_img.mode != 'RGB':
                    pil_img = pil_img.convert('RGB')
                contents = [prompt, pil_img]
                logger.info(f"VISION mode — image size: {pil_img.size}")
            except Exception as e:
                logger.warning(f"Image load failed: {e}, falling back to text")
                contents = []

        # TEXT mode fallback
        if not contents:
            if text and len(text.strip()) > 20:
                contents = [f"{prompt}\n\nDOCUMENT TEXT:\n{text}"]
                logger.info(f"TEXT mode — {len(text)} chars")
            else:
                logger.error("No image and no text — cannot extract!")
                return _empty(document_type)

        logger.info("Calling Gemini API...")
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
        )
        raw = response.text.strip()
        logger.info(f"Gemini response:\n{raw[:500]}")

        result = _parse_json(raw)
        if result:
            result = _clean(result)
            non_null = sum(1 for v in result.values() if v is not None and v != [] and v != "")
            logger.info(f"✅ Extraction SUCCESS — {non_null} fields extracted!")
            return result

        logger.error(f"JSON parse failed! Raw:\n{raw[:300]}")
        return _empty(document_type)

    except Exception as e:
        logger.error(f"Gemini error: {e}", exc_info=True)
        return _empty(document_type)


def _clean(data: Any) -> Any:
    if isinstance(data, dict):
        return {k: _clean(v) for k, v in data.items()}
    if isinstance(data, list):
        return [_clean(i) for i in data]
    if isinstance(data, str):
        if data.strip().lower() in ('null', 'none', 'n/a', 'na', 'nil', '-', ''):
            return None
        return data
    return data


def _parse_json(content: str) -> Optional[Dict]:
    try:
        return json.loads(content)
    except:
        pass
    content = re.sub(r'```json\s*', '', content)
    content = re.sub(r'```\s*', '', content)
    content = content.strip()
    try:
        return json.loads(content)
    except:
        pass
    m = re.search(r'\{[\s\S]*\}', content)
    if m:
        try:
            return json.loads(m.group())
        except:
            pass
    return None


def _empty(document_type: str) -> Dict:
    if document_type == "banking":
        return {
            "bank_name": None, "branch_name": None,
            "account_number": None, "account_type": None,
            "account_holder": None, "ifsc_code": None,
            "statement_period_start": None, "statement_period_end": None,
            "opening_balance": None, "closing_balance": None,
            "total_deposits": None, "total_withdrawals": None,
            "average_balance": None, "interest_earned": None,
            "service_charges": None, "transactions": []
        }
    elif document_type == "insurance":
        return {
            "policy_number": None, "claim_number": None,
            "claimant_name": None, "date_of_birth": None,
            "contact_number": None, "claim_date": None,
            "incident_date": None, "incident_description": None,
            "claim_type": None, "claim_amount": None,
            "approved_amount": None, "insurer_name": None,
            "policy_type": None, "sum_insured": None,
            "premium_amount": None, "hospital_name": None,
            "vehicle_number": None, "diagnosis": None, "agent_name": None
        }
    elif document_type == "invoice":
        return {
            "invoice_number": None, "invoice_date": None,
            "due_date": None, "payment_terms": None, "po_number": None,
            "vendor_name": None, "vendor_address": None,
            "vendor_gst": None, "vendor_bank": None,
            "customer_name": None, "customer_address": None,
            "shipping_address": None, "items": [],
            "subtotal": None, "discount_amount": None,
            "tax_rate": None, "tax_amount": None,
            "total_amount": None, "currency": "USD", "notes": None
        }
    return {}