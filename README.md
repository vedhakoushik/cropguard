# 🌾 CropGuard AI

AI-powered crop pest & disease analyzer for Andhra Pradesh farmers. Upload a photo of an affected crop and get an instant pest/disease diagnosis, a severity rating, Indian-brand pesticide recommendations, organic alternatives, and prevention tips — all grounded in district-level crop data and available in the farmer's own language.

Live diagnosis is followed by a contextual chat: farmers can ask follow-up questions ("how much do I spray?", "is this organic?") and get concise, direct answers instead of a full re-analysis.

---

## How it works

1. A farmer signs up / logs in (Supabase Auth) and selects their crop, district, and language.
2. They upload a photo. The backend uploads it to Supabase Storage, then sends it — together with known pests for that crop, the district's main crops, and real district crop-area/yield data pulled from Supabase — to **Gemini 1.5 Flash Vision**.
3. Gemini returns structured JSON: pest/disease name, confidence, severity, cause, Indian-brand pesticide + dosage, an organic alternative, prevention tips, and district-specific risk notes.
4. The result is saved to Supabase and rendered in the chat UI. If Gemini times out, errors, or returns malformed JSON, a rule-based fallback diagnosis (keyed off the crop's most common AP pest) is returned instead, so the app never dead-ends.
5. The farmer can keep chatting in that session; recent messages are summarized and passed back to Gemini so follow-ups stay on-topic without repeating the full diagnosis.

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, Flask 3, Flask-CORS |
| AI | Google Gemini 1.5 Flash (vision + text), via `google-generativeai` |
| Database / Storage / Auth | Supabase (Postgres, Storage buckets, Auth) |
| Frontend | Jinja2 templates, vanilla JS, plain CSS (no build step) |
| Config | `python-dotenv` + a single `Config` class |

---

## Project structure

```
cropguard/
├── backend/
│   ├── app.py                      Flask app factory / entry point, blueprint registration
│   ├── config.py                   Loads .env into a Config class
│   ├── requirements.txt            Python dependencies
│   ├── .env.example                Template — copy to .env and fill in real keys
│   ├── routes/
│   │   ├── analysis.py             /api/analysis/* — locations, location-crops, analyze
│   │   ├── chat.py                 /api/chat/*     — sessions, messages, crops
│   │   └── auth.py                 /login, /signup, /logout (session-based)
│   └── services/
│       ├── gemini.py                Gemini prompts, AP pest/district knowledge base, fallback logic
│       ├── supabase_client.py       Lazily-initialized Supabase client singleton
│       └── auth_service.py          Supabase Auth sign up / sign in / sign out
├── frontend/
│   ├── templates/
│   │   ├── base.html                Shared layout, nav, auth state
│   │   ├── index.html               Homepage
│   │   ├── auth.html                Login / signup form
│   │   └── chat.html                Upload + chat/analysis UI
│   └── static/
│       ├── css/style.css
│       └── js/
│           ├── chat.js              Upload, analysis rendering, chat, WhatsApp share
│           ├── home.js
│           ├── theme.js             Light/dark theme toggle
│           └── translations.js      UI string translations (EN/TE/HI/TA)
└── supabase/
    ├── andhra_pradesh_complete.sql  Schema + AP reference data — run FIRST
    └── location_data.sql            District crop-area/yield data — run SECOND
```

---

## API reference

All JSON endpoints return `200` on success (even for internal failures, where possible, so the frontend can render a graceful fallback) unless noted.

### Pages
| Route | Method | Description |
|---|---|---|
| `/` | GET | Homepage |
| `/chat` | GET | Upload + chat UI |
| `/login`, `/signup` | GET/POST | Auth forms (Supabase Auth, session cookie based) |
| `/logout` | POST | Clears session |
| `/api/health` | GET | Health check → `{"status": "ok", "app": "CropGuard AI"}` |

### Analysis (`/api/analysis`)
| Route | Method | Description |
|---|---|---|
| `/locations` | GET | State → list of districts (falls back to the built-in AP district list if Supabase is unreachable) |
| `/location-crops` | GET | `?state=&district=` → crop area/production/yield stats for that district |
| `/analyze` | POST | `multipart/form-data`: `image` (jpg/png/webp, ≤`MAX_IMAGE_MB`), plus `crop_id`, `session_id`, `crop_name`, `state`, `district`, `language`. Uploads image, runs Gemini analysis, persists the result, returns the diagnosis JSON. |

### Chat (`/api/chat`)
| Route | Method | Description |
|---|---|---|
| `/sessions` | GET | Last 20 chat sessions |
| `/sessions` | POST | Create a session — `{crop_id, title}` |
| `/sessions/<id>` | DELETE | Delete a session |
| `/sessions/<id>/messages` | GET | Full message history for a session |
| `/sessions/<id>/messages` | POST | Send a farmer message — `{message, context}` → saves it, calls Gemini (or the fallback responder), returns the AI reply |
| `/sessions/<id>/analysis` | GET | Most recent diagnosis for a session |
| `/crops` | GET | List of crops (falls back to the built-in AP crop list) |

---

## Setup

### 1. Prerequisites
- Python 3.11+
- A free [Supabase](https://supabase.com) project
- A [Gemini API key](https://aistudio.google.com/app/apikey)

### 2. Install dependencies
```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure environment
```bash
cp .env.example .env
```
Fill in `.env`:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Project Settings → API |
| `SUPABASE_KEY` | Project Settings → API (anon key) |
| `GEMINI_API_KEY` | Google AI Studio |
| `SUPABASE_BUCKET` | Storage bucket name for uploaded images (default `crop-images`) |
| `SECRET_KEY` | Flask session signing key — set to a random string in production |
| `DEBUG` | `true`/`false` |
| `MAX_IMAGE_MB` | Upload size limit (default `10`) |

`.env` is git-ignored and must never be committed — see **Security** below.

### 4. Set up the database
In the Supabase SQL Editor, run, **in order**:
1. `supabase/andhra_pradesh_complete.sql` — schema + AP reference data
2. `supabase/location_data.sql` — district crop-area/yield data

Also create a public Storage bucket named to match `SUPABASE_BUCKET` (default `crop-images`).

### 5. Run
```bash
cd backend
python app.py
```
Open http://localhost:5000

---

## Features

- 📷 Photo-based pest/disease diagnosis via Gemini Vision
- 📍 Location-aware results using real district crop-area/yield data (26 AP districts)
- 💊 Indian-brand pesticide + dosage recommendations (Confidor, Dithane M-45, Blitox, etc.)
- 🌿 Organic alternatives alongside every chemical recommendation
- 🗣️ Multi-language UI and AI responses (English, Telugu, Hindi, Tamil)
- 💬 Context-aware follow-up chat per session
- 🔐 Supabase-backed auth (sign up / login / logout)
- 🧯 Graceful degradation — rule-based fallback diagnosis and chat replies when Gemini times out, errors, or Supabase is unreachable

---

## Security

- **Never commit `.env`.** It holds live Supabase and Gemini credentials; `.gitignore` excludes it, and only `.env.example` (with placeholder values) is tracked.
- If real keys were ever committed or shared, rotate them immediately in the Supabase and Google AI Studio dashboards.
- The Supabase key used here is the public **anon** key, meant to be used from a client and protected by Row Level Security policies — verify RLS is enabled on all tables before going to production.
- Flask `SECRET_KEY` defaults to a placeholder in `config.py`; set a strong random value via `.env` for any real deployment.

---

## Known limitations

- Gemini responses are capped at an 8-second timeout (`GEMINI_TIMEOUT_SECONDS`); slow responses fall back to a rule-based diagnosis rather than blocking the request.
- `analysis.py` writes several records (image, analysis, chat summary) as separate best-effort Supabase calls — a mid-sequence failure can leave partial data rather than rolling back.
- No automated test suite yet.
