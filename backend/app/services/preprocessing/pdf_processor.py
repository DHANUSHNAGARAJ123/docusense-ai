import io
import logging
from typing import List

logger = logging.getLogger(__name__)


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from PDF - tries multiple methods"""
    text_parts = []

    # METHOD 1: pdfplumber (best for tables + text)
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page_num, page in enumerate(pdf.pages):
                # Extract regular text
                text = page.extract_text(x_tolerance=3, y_tolerance=3)
                if text and text.strip():
                    text_parts.append(f"--- PAGE {page_num + 1} ---\n{text}")

                # Extract tables separately
                tables = page.extract_tables()
                for table in tables:
                    if table:
                        for row in table:
                            if row:
                                clean_row = [str(cell).strip() if cell else '' for cell in row]
                                if any(clean_row):
                                    text_parts.append(' | '.join(clean_row))

        if text_parts:
            result = '\n'.join(text_parts)
            logger.info(f"pdfplumber extracted {len(result)} chars from {len(text_parts)} sections")
            return result
    except ImportError:
        logger.warning("pdfplumber not installed - pip install pdfplumber")
    except Exception as e:
        logger.warning(f"pdfplumber failed: {e}")

    # METHOD 2: PyMuPDF / fitz (very accurate)
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page in doc:
            text = page.get_text("text")
            if text.strip():
                text_parts.append(text)
        doc.close()
        if text_parts:
            result = '\n'.join(text_parts)
            logger.info(f"PyMuPDF extracted {len(result)} chars")
            return result
    except ImportError:
        pass
    except Exception as e:
        logger.warning(f"PyMuPDF failed: {e}")

    # METHOD 3: PyPDF2 fallback
    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
        for page in reader.pages:
            t = page.extract_text()
            if t and t.strip():
                text_parts.append(t)
        if text_parts:
            result = '\n'.join(text_parts)
            logger.info(f"PyPDF2 extracted {len(result)} chars")
            return result
    except Exception as e:
        logger.warning(f"PyPDF2 failed: {e}")

    logger.error("All PDF text extraction methods failed!")
    return ''


def convert_pdf_to_images(pdf_bytes: bytes, dpi: int = 200) -> List[bytes]:
    """Convert PDF to images for OCR (scanned PDFs)"""
    # METHOD 1: PyMuPDF (fastest, no poppler needed)
    try:
        import fitz
        from PIL import Image
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        images = []
        for page in doc:
            mat = fitz.Matrix(dpi / 72, dpi / 72)
            pix = page.get_pixmap(matrix=mat)
            img_bytes = pix.tobytes("png")
            images.append(img_bytes)
        doc.close()
        logger.info(f"PyMuPDF converted {len(images)} pages to images")
        return images
    except ImportError:
        pass
    except Exception as e:
        logger.warning(f"PyMuPDF image conversion failed: {e}")

    # METHOD 2: pdf2image
    try:
        from pdf2image import convert_from_bytes
        images = convert_from_bytes(pdf_bytes, dpi=dpi, fmt='PNG')
        result = []
        for img in images:
            out = io.BytesIO()
            img.save(out, format='PNG')
            result.append(out.getvalue())
        logger.info(f"pdf2image converted {len(result)} pages")
        return result
    except ImportError:
        pass
    except Exception as e:
        logger.warning(f"pdf2image failed: {e}")

    return []


def get_pdf_page_count(pdf_bytes: bytes) -> int:
    try:
        import PyPDF2
        return len(PyPDF2.PdfReader(io.BytesIO(pdf_bytes)).pages)
    except:
        return 1