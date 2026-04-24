import logging
import io
from typing import Dict, Any

logger = logging.getLogger(__name__)

def extract_text_with_tesseract(image_bytes: bytes) -> Dict[str, Any]:
    try:
        import pytesseract
        from PIL import Image, ImageFilter, ImageEnhance
        import io

        img = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if needed
        if img.mode not in ('RGB', 'L'):
            img = img.convert('RGB')
        
        # Enhance image for better OCR
        img = img.convert('L')  # Grayscale
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(2.0)
        enhancer = ImageEnhance.Sharpness(img)
        img = enhancer.enhance(2.0)
        
        # Resize if too small
        w, h = img.size
        if w < 1000:
            scale = 1000 / w
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

        # Run OCR with best config
        custom_config = r'--oem 3 --psm 6 -c preserve_interword_spaces=1'
        full_text = pytesseract.image_to_string(img, config=custom_config, lang='eng')
        
        # Get confidence
        data = pytesseract.image_to_data(img, config=custom_config, output_type=pytesseract.Output.DICT)
        confs = [int(c) for c in data['conf'] if str(c).isdigit() and int(c) > 0]
        avg_conf = sum(confs) / len(confs) if confs else 60.0

        logger.info(f"Tesseract OCR: {len(full_text)} chars, confidence: {avg_conf:.1f}%")
        return {
            "text": full_text,
            "confidence": avg_conf,
            "words": []
        }

    except ImportError:
        logger.warning("pytesseract not installed")
        return {"text": "", "confidence": 60.0, "words": []}
    except Exception as e:
        logger.error(f"Tesseract error: {e}")
        return {"text": "", "confidence": 50.0, "words": []}