# SmileCare — Dental Receptionist AI Agent

A full-stack AI dental receptionist that books, reschedules, and cancels appointments
and answers clinic questions via RAG. **FastAPI + LangChain + Google Gemini + MongoDB**
on the backend, **React (Vite) + Tailwind** on the frontend.

## Features
- Patient chat (`/`) — book / reschedule / cancel appointments, ask clinic questions
- LangChain tool-calling agent (Gemini) with 6 tools + FAISS-based RAG
- Admin dashboard (`/dashboard`) — stats, appointment manager, conversation monitor,
  editable Agent Knowledge (re-embeds automatically on every change)

## Prerequisites
- Python **3.11+**
- Node **18+**
- MongoDB running locally (`mongodb://localhost:27017`) or a MongoDB Atlas URI
- A Google AI Studio API key (https://aistudio.google.com/app/apikey)

## Backend setup
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate   |   macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then edit .env with your GOOGLE_API_KEY / MONGODB_URI
uvicorn main:app --reload
```
Backend runs at http://localhost:8000 (API docs at `/docs`).

> Run a **single** uvicorn worker in dev — the FAISS index lives in-process.

## Frontend setup
```bash
cd frontend
npm install
cp .env.example .env        # VITE_API_BASE_URL=http://localhost:8000
npm run dev
```

## First run — seed knowledge
After the backend is up, populate the default clinic knowledge (and build the vector index):
```bash
curl -X POST http://localhost:8000/api/knowledge/seed
```

## Access
- Patient chat: http://localhost:5173
- Admin dashboard: http://localhost:5173/dashboard

## Environment
**backend/.env**
```
GOOGLE_API_KEY=your_google_ai_studio_key
MONGODB_URI=mongodb://localhost:27017
DB_NAME=dental_ai
# optional: LLM_MODEL, EMBED_MODEL, CLINIC_NAME
```
**frontend/.env**
```
VITE_API_BASE_URL=http://localhost:8000
```

## Notes
- Default models are `gemini-2.0-flash` and `models/gemini-embedding-001` (the spec's
  `gemini-1.5-flash` / `embedding-001` are retired on the Generative Language API).
  Override `LLM_MODEL` / `EMBED_MODEL` in `backend/.env` if your account differs.
- Appointment slots are 30-minute intervals, 9:00 AM–6:30 PM.
"# ai-dental-receptionist" 
