import re, logging
from typing import Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)

REQUIRED_FIELDS = {
    "banking":   ["bank_name","account_number","account_holder","statement_period_start","statement_period_end","opening_balance","closing_balance"],
    "insurance": ["policy_number","claimant_name","claim_date","claim_amount","claim_type","incident_description"],
    "invoice":   ["invoice_number","invoice_date","vendor_name","customer_name","total_amount"],
}

def calculate_confidence_scores(extracted_data: Dict, ocr_confidence: float, document_type: str) -> List[Dict]:
    fields = REQUIRED_FIELDS.get(document_type, list(extracted_data.keys()))
    scores = []
    for field in fields:
        value    = extracted_data.get(field)
        ocr_c    = min(100.0, max(0.0, ocr_confidence))
        llm_c    = _llm_conf(field, value)
        val_c    = _validate(field, value, document_type)
        overall  = round(0.30*ocr_c + 0.40*llm_c + 0.30*val_c, 2)
        scores.append({
            "field_name":field,"field_value":str(value) if value is not None else "",
            "confidence_score":overall,"ocr_confidence":round(ocr_c,2),
            "llm_confidence":round(llm_c,2),"validation_score":round(val_c,2),
            "needs_review": overall < 75.0 or value is None,
        })
    return scores

def get_overall_confidence(scores: List[Dict]) -> float:
    if not scores: return 50.0
    return round(sum(s["confidence_score"] for s in scores) / len(scores), 2)

def _llm_conf(field: str, value: Any) -> float:
    if value is None or str(value).strip() in ["","null","None","unknown","n/a"]: return 20.0
    v = str(value).strip()
    if "date" in field or "period" in field:
        return 90.0 if re.match(r"^\d{4}-\d{2}-\d{2}$", v) else 50.0
    if any(k in field for k in ["amount","balance","total","debit","credit"]):
        try: float(v.replace(",","").replace("₹","").replace("$","")); return 88.0
        except: return 40.0
    if any(k in field for k in ["number","account","policy","invoice"]):
        return 85.0 if len(v) >= 4 else 60.0
    return 82.0 if len(v) > 2 else 60.0

def _validate(field: str, value: Any, doc_type: str) -> float:
    if value is None or str(value).strip() == "": return 0.0
    v = str(value).strip(); score = 100.0
    try:
        if "date" in field or "period" in field:
            if not re.match(r"^\d{4}-\d{2}-\d{2}$", v): score -= 40
            else: datetime.strptime(v, "%Y-%m-%d")
        elif any(k in field for k in ["amount","balance","total","subtotal"]):
            n = float(v.replace(",","").replace("₹","").replace("$",""))
            if n < 0: score -= 20
        elif doc_type == "banking" and field == "account_number":
            if len(v.replace(" ","")) < 8: score -= 30
        elif doc_type == "insurance" and field == "policy_number":
            if len(v) < 4: score -= 40
        elif len(v) < 2: score -= 30
    except: score -= 35
    return max(0.0, score)