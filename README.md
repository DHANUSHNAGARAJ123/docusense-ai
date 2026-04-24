# 🧠 DocuSense AI — Multimodal Document Processing System

> AI-powered document intelligence platform that extracts structured data from bank statements, insurance claims, and invoices using Google Gemini Vision API with per-field confidence scoring.

![DocuSense AI](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-blue?style=for-the-badge&logo=google)
![React](https://img.shields.io/badge/Frontend-React%20+%20TypeScript-61DAFB?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)
![Firebase](https://img.shields.io/badge/Auth-Firebase-orange?style=for-the-badge&logo=firebase)

---

## ✨ Features

- 📄 **Multi-format support** — PDF, JPG, PNG documents
- 🤖 **Gemini Vision AI** — Direct image analysis for highest accuracy
- 📊 **3 Document types** — Banking, Insurance, Invoice
- 🎯 **Per-field confidence scoring** — OCR + AI + Validation scores
- 🔐 **Firebase Authentication** — Secure per-user data isolation
- 📈 **Dashboard Analytics** — Charts, trends, confidence distribution
- 🔍 **Live Search** — Search documents by name, type, status
- 📥 **Export** — Excel (.xlsx) and JSON download
- ✏️ **Manual correction** — Edit extracted fields inline
- 📋 **Audit trail** — Complete action history
- 🗑️ **Delete & manage** — Full document lifecycle

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, Framer Motion |
| Charts | Recharts |
| Backend | Python, FastAPI, SQLAlchemy |
| Database | SQLite (local) |
| AI Model | Google Gemini 2.5 Flash (Vision) |
| Auth | Firebase Authentication |
| Realtime DB | Firebase Realtime Database |
| PDF Processing | PyMuPDF, pdfplumber |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ — https://nodejs.org
- **Python** 3.10+ — https://python.org
- **Google Gemini API Key** — https://aistudio.google.com/apikey
- **Firebase Project** — https://console.firebase.google.com

---

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/docusense-ai.git
cd docusense-ai
```

---

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install fastapi "uvicorn[standard]" python-multipart sqlalchemy pydantic \
  pydantic-settings python-dotenv aiofiles PyPDF2 "python-jose[cryptography]" \
  Pillow PyMuPDF pdfplumber google-genai
```

#### Create `backend/.env` file

```env
DATABASE_URL=sqlite:///./docusense.db
GEMINI_API_KEY=your_gemini_api_key_here
STORAGE_TYPE=local
LOCAL_UPLOAD_DIR=./uploads
CONFIDENCE_THRESHOLD=75.0
MAX_FILE_SIZE=52428800
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
```

#### Run backend

```bash
uvicorn app.main:app --reload --port 8000
```

Backend runs at: `http://localhost:8000`
API docs at: `http://localhost:8000/docs`

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Install additional packages
npm install recharts xlsx firebase
```

#### Firebase Setup

1. Go to https://console.firebase.google.com
2. Create a new project or use existing
3. **Authentication** → Sign-in method → Enable **Email/Password**
4. **Realtime Database** → Create database → Set rules:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "documents": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "extractions": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

5. Update `frontend/src/services/firebase.ts` with your Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

#### Run frontend

```bash
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

### 4. Open in browser

```
http://localhost:5173
```

Register a new account and start uploading documents!

---

## 📁 Project Structure

```
docusense-ai/
├── frontend/                    # React + TypeScript
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx        # Firebase auth
│   │   │   ├── DashboardPage.tsx    # Charts + stats
│   │   │   ├── UploadPage.tsx       # File upload
│   │   │   ├── ProcessingPage.tsx   # Progress tracking
│   │   │   ├── ResultsPage.tsx      # Extraction results + export
│   │   │   ├── ReviewQueuePage.tsx  # Document management
│   │   │   ├── AuditLogPage.tsx     # Audit trail
│   │   │   └── InsightsPage.tsx     # Analytics
│   │   ├── services/
│   │   │   ├── api.ts               # Axios API client
│   │   │   └── firebase.ts          # Firebase config + helpers
│   │   └── components/
│   │       └── layout/
│   │           └── AppLayout.tsx    # Sidebar + search bar
│   └── package.json
│
├── backend/                     # Python FastAPI
│   ├── app/
│   │   ├── main.py                  # FastAPI app entry
│   │   ├── core/
│   │   │   ├── config.py            # Settings
│   │   │   └── database.py          # SQLAlchemy setup
│   │   ├── models/
│   │   │   └── models.py            # DB models
│   │   ├── api/routes/
│   │   │   ├── upload.py            # File upload endpoint
│   │   │   ├── documents.py         # Document CRUD
│   │   │   ├── extraction.py        # Extraction results
│   │   │   ├── review.py            # Review queue
│   │   │   ├── audit.py             # Audit logs
│   │   │   └── stats.py             # Dashboard stats
│   │   └── services/
│   │       ├── orchestrator.py      # Processing pipeline
│   │       ├── preprocessing/
│   │       │   └── pdf_processor.py # PDF text + image extraction
│   │       ├── ocr/
│   │       │   └── tesseract_ocr.py # OCR fallback
│   │       ├── extraction/
│   │       │   └── llm_extractor.py # Gemini Vision API
│   │       └── confidence/
│   │           └── scorer.py        # Confidence scoring
│   ├── .env                         # Environment variables (not in git)
│   └── requirements.txt
│
└── README.md
```

---

## 🔄 How It Works

```
Upload PDF/Image
      ↓
PDF Text Extraction (PyMuPDF / pdfplumber)
      ↓
Convert to Image (PyMuPDF)
      ↓
Gemini 2.5 Flash Vision API
      ↓
Structured JSON Extraction
      ↓
Per-field Confidence Scoring
      ↓
Save to SQLite + Firebase
      ↓
Display Results with Edit + Export
```

---

## 📊 Supported Document Types

### 🏦 Banking
Bank name, account number, holder name, IFSC code, account type, statement period, opening/closing balance, all transactions (date, description, debit, credit, balance)

### 🏥 Insurance
Policy number, claim number, claimant details, incident description, claim amount, hospital/vehicle info, diagnosis, agent details

### 🧾 Invoice
Invoice number, dates, vendor/customer details, GST number, line items, subtotal, tax, total amount

---

## 🔐 Security

- Firebase Authentication — email/password with JWT tokens
- Per-user data isolation — users only see their own documents
- API keys stored in `.env` (never committed to git)
- CORS configured for localhost only

---

## 📦 Requirements

### Backend (`pip install`)
```
fastapi
uvicorn[standard]
python-multipart
sqlalchemy
pydantic
pydantic-settings
python-dotenv
aiofiles
PyPDF2
python-jose[cryptography]
Pillow
PyMuPDF
pdfplumber
google-genai
```

### Frontend (`npm install`)
```
react
react-router-dom
framer-motion
recharts
xlsx
firebase
axios
react-hot-toast
lucide-react
tailwindcss
```

---

## 🐛 Troubleshooting

**Backend won't start — Python not found**
```bash
# Check available Python versions
py --list

# Use specific version
py -3.11 -m venv venv
```

**Gemini API quota exceeded**
- Get a new API key from https://aistudio.google.com/apikey
- Free tier: 1500 requests/day

**PDF extraction returning 0 chars**
- PDF is scanned (image-based) — Gemini Vision handles this automatically
- Install PyMuPDF: `pip install PyMuPDF`

**Firebase auth error**
- Enable Email/Password in Firebase Console → Authentication → Sign-in method

---

## 👨‍💻 Author

**Nagaraj Dhanush**
- Built with React, FastAPI, and Google Gemini AI
- Firebase for authentication and real-time data

---

## 📄 License

MIT License — feel free to use and modify.
