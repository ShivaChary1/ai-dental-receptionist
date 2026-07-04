# SmileCare — Multi-Tenant Dental Care Platform

A full-stack, multi-tenant dental platform. **FastAPI + LangChain + Google Gemini +
MongoDB** backend, **React (Vite) + Tailwind** frontend. Three roles — **patients**,
**clinic (hospital) admins**, and a **platform super admin** — with clinic onboarding &
approval, a hospital directory, a general triage AI, per-clinic AI booking widgets, a
pluggable booking adapter, and analytics.

## Platform at a glance
- **Patients** (`/`): general **triage AI** with saved chats (home-care vs. see-a-dentist,
  recommends nearby approved clinics); **clinic directory** (`/clinics`, sort by nearest/
  rating, filters); **hospital detail** with a **clinic-scoped AI widget** that books/
  cancels/reschedules; account, **My Bookings**, favorites, reviews.
- **Clinics apply** at `/apply`; the **super admin** (`/superadmin`) approves/rejects, which
  provisions the clinic + a staff login.
- **Clinic admins** (`/hospital`): overview, conversation log, bookings, editable profile/
  doctors/hours/booking-config, and an **Insights** dashboard.
- **Booking adapter** (`services/booking_adapter.py`): `internal` mode (built-in bookings)
  or `rest` mode (forwards to the clinic's own CRM); every call is logged to `adapter_logs`.
- Geolocation uses a local **haversine** calc (no Maps API key). Seed sample clinics with
  `python seed_platform.py` (staff logins: `smilecare@example.com` / `brightsmile@example.com`,
  password `clinic123`).

> The original single-clinic receptionist still lives under `/dashboard` (super-admin gated)
> and the `/api/chat` + WhatsApp webhook endpoints. The sections below describe that base.

## Features
- Patient chat (`/`) — book / reschedule / cancel appointments, ask clinic questions
- LangChain tool-calling agent (Gemini) with 6 tools + FAISS-based RAG
- Admin dashboard (`/dashboard`) — stats, appointment manager, conversation monitor,
  editable Agent Knowledge (re-embeds automatically on every change)
- **Patient accounts** — sign up / log in with **email + password** or **phone + OTP**;
  logged-in patients get their conversations and appointments tied to their account
- **Admin login** — single admin account seeded from `.env`; the whole dashboard and
  knowledge API are JWT-protected
- **WhatsApp channel** — Meta Cloud API webhook so the same agent answers on WhatsApp
  (ships with a dev stub that logs outgoing messages until real credentials are added)

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

## Authentication

**Patients** (`/login`, `/register`):
- Email + password, or phone + OTP (either creates/accesses the account).
- In dev the OTP is **logged** (see `backend/app.log`, line `OTP for <phone> = <code>`)
  and also routed through the WhatsApp sender. Once real WhatsApp creds are set, the code
  is delivered over WhatsApp.

**Admin** (`/admin/login`):
- Single account defined by `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `backend/.env`.
- The dashboard (`/dashboard/*`) and all `/api/dashboard` + `/api/knowledge` endpoints
  require an admin JWT. `/api/knowledge/seed` is therefore admin-only now — seed either by
  logging in as admin first, or by running the standalone `python seed_data.py` script.

Auth endpoints:
```
POST /api/auth/register        {email, password, name?, phone?}   -> {access_token, role, user}
POST /api/auth/login           {email, password}
POST /api/auth/otp/request     {phone}
POST /api/auth/otp/verify      {phone, code, name?}
GET  /api/auth/me              (Bearer patient token)
POST /api/admin/login          {email, password}                  -> admin token
GET  /api/admin/me             (Bearer admin token)
```

## WhatsApp (Meta Cloud API)

Endpoints:
```
GET  /api/whatsapp/webhook   Meta verification handshake (echoes hub.challenge)
POST /api/whatsapp/webhook   inbound messages -> agent -> reply
```

Setup:
1. Create a Meta app with the **WhatsApp** product; note your **Phone Number ID** and a
   **temporary/permanent access token**.
2. Set `WHATSAPP_VERIFY_TOKEN` (any string you choose), `WHATSAPP_TOKEN`, and
   `WHATSAPP_PHONE_NUMBER_ID` in `backend/.env`.
3. Expose the backend publicly (e.g. `ngrok http 8000`) and register the callback URL
   `https://<public-host>/api/whatsapp/webhook` in the Meta dashboard, using the same
   verify token.

> Until `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` are set, `send_text` runs in **stub
> mode**: it logs the outgoing message instead of calling Meta, so you can test the webhook
> locally by POSTing a sample Meta payload to `/api/whatsapp/webhook`.

## Environment
**backend/.env**
```
GOOGLE_API_KEY=your_google_ai_studio_key
MONGODB_URI=mongodb://localhost:27017
DB_NAME=dental_ai
# optional: LLM_MODEL, EMBED_MODEL, CLINIC_NAME

# auth
JWT_SECRET=change-me-to-a-long-random-string
ADMIN_EMAIL=admin@smilecare.com
ADMIN_PASSWORD=change-me

# whatsapp (placeholders until you go live)
WHATSAPP_VERIFY_TOKEN=my-webhook-verify-token
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
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
