import cv2, numpy as np, io, logging
from PIL import Image

logger = logging.getLogger(__name__)

def preprocess_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> bytes:
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None: return image_bytes
        gray     = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        denoised = cv2.fastNlMeansDenoising(gray, h=10)
        denoised = _deskew(denoised)
        clahe    = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(denoised)
        _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        pil_img  = Image.fromarray(binary)
        out      = io.BytesIO()
        pil_img.save(out, format="PNG")
        return out.getvalue()
    except Exception as e:
        logger.error(f"Preprocessing error: {e}")
        return image_bytes

def _deskew(gray: np.ndarray) -> np.ndarray:
    try:
        coords = np.column_stack(np.where(gray > 0))
        if len(coords) < 10: return gray
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45: angle = 90 + angle
        if abs(angle) < 0.5: return gray
        h, w = gray.shape
        M = cv2.getRotationMatrix2D((w//2, h//2), angle, 1.0)
        return cv2.warpAffine(gray, M, (w,h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    except: return gray