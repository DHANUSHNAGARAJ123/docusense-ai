import os, logging
from pathlib import Path
from app.core.config import settings

logger = logging.getLogger(__name__)

def get_upload_dir() -> Path:
    p = Path(settings.LOCAL_UPLOAD_DIR); p.mkdir(parents=True, exist_ok=True); return p

def save_file_local(file_bytes: bytes, filename: str, doc_id: str) -> str:
    d = get_upload_dir() / doc_id; d.mkdir(parents=True, exist_ok=True)
    fp = d / filename
    with open(fp, "wb") as f: f.write(file_bytes)
    return str(fp)

def read_file_local(file_path: str) -> bytes:
    with open(file_path, "rb") as f: return f.read()