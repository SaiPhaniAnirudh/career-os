# Career OS

An AI-powered career & placement platform — resume/JD matching, mock interviews, skill-gap tracking, and application tracking in one place. Built for anyone in the world who's job-seeking or switching careers.

## Stack

- **Backend:** Flask + Supabase (Postgres + Auth + RLS) + Groq API (Llama 3.3 70B)
- **Frontend:** Vite + Vanilla JS/CSS (dark glassmorphic SPA)
- **Auth:** Supabase JWT (email + password)
- **Deployment:** Zero-budget — free Supabase tier + free Groq API tier

## Status

- **Phase 0** — Repo, Supabase project, schema, RLS ✅
- **Phase 1** — Application tracker (full CRUD + kanban) + Resume/JD ingestion + keyword-overlap matcher ✅
- **Phase 2** — Mock interview engine (LLM-driven via Groq) ✅
- **Phase 3** — Skill gap tracker (`GET /api/skill-gaps`, ranks missing keywords across your past matches) ✅
- **Frontend** — Full premium SPA (login, dashboard, kanban, matcher, chat interview) ✅
- **Phase 4** — Peer matchmaking (stretch) — not started

> **Fixed:** `.env.example` previously shipped the new-format `sb_publishable_...` Supabase key, which the pinned `supabase-py==2.7.4` client rejects outright (`Invalid API key`) — every authenticated route was returning 500. Reverted to the legacy JWT-format anon key, which this client version actually supports. Also decoupled `GROQ_API_KEY` from `Config.validate()` — the applications tracker needs zero AI and was incorrectly refusing to start without a Groq key; that check now lives in `llm_client.generate()` where it belongs, so only interview routes 503 when the key's missing. CORS and the frontend's `API_BASE` were both hardcoded to localhost — both are now env-configurable for deployment.

## Quick start

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env       # fill in GROQ_API_KEY
python app.py
```

Health check: `GET http://localhost:5000/api/health`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open: `http://localhost:5173`

## Environment variables

See `backend/.env.example`:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_KEY` | ✅ | Supabase anon key — must be the **legacy JWT format** (starts with `eyJ...`), not the newer `sb_publishable_...` format; the pinned `supabase-py` version doesn't accept the latter |
| `GROQ_API_KEY` | for interview module only | Free key from [console.groq.com](https://console.groq.com). Everything else (applications, matching) works without it |
| `GROQ_MODEL` | | Default: `llama-3.3-70b-versatile` |
| `ALLOWED_ORIGINS` | for prod | Comma-separated frontend origins for CORS. Defaults to Vite's local dev ports |
| `FLASK_ENV` | | Default: `development` |

Frontend: set `VITE_API_BASE` (in `frontend/.env`) to your deployed backend URL once it's live — defaults to `http://localhost:5000` for local dev.

## API surface

```
GET    /api/health
GET    /api/applications
POST   /api/applications
PATCH  /api/applications/<id>
DELETE /api/applications/<id>
POST   /api/resume/upload        (multipart 'file' as PDF, or JSON {raw_text})
POST   /api/jd/submit            (JSON {raw_text})
POST   /api/match                (JSON {resume_id, jd_id})
POST   /api/interview/start      (JSON {jd_id?})
POST   /api/interview/respond    (JSON {session_id, answer})
POST   /api/interview/feedback   (JSON {session_id})
GET    /api/skill-gaps
```

All routes except `/api/health` require `Authorization: Bearer <supabase-jwt>`.

## Database

Tables: `resumes`, `job_descriptions`, `matches`, `interview_sessions`, `applications` — all with Row Level Security so each user only ever sees their own rows.

## Frontend pages

| Page | Route | Description |
|------|-------|-------------|
| Login | `#/login` | Split-screen auth (sign-in / sign-up) |
| Dashboard | `#/dashboard` | Stats overview, quick actions, recent activity |
| Applications | `#/applications` | Kanban board with drag-and-drop stage management |
| Matcher | `#/matcher` | Resume upload + JD paste → animated match score + keyword analysis |
| Interview | `#/interview` | Chat-style mock interview with AI + feedback |

## Testing

```bash
cd backend
python3 tests/test_routes.py
```

Mocked route-level tests — no live network needed. Covers CRUD validation, auth rejection, the skill-gaps aggregation, and two regression tests for the bugs fixed above (applications working without a Groq key, interview correctly 503ing when it's missing).

## Next steps

1. Get a free Groq API key and add it to `.env`
2. Deploy backend (Render) with `ALLOWED_ORIGINS` set to your frontend's real URL
3. Build the frontend (`npm run build`) with `VITE_API_BASE` pointing at the deployed backend, then deploy the `dist/` output (Vercel / Netlify — simpler than GitHub Pages for a Vite app)
4. Add OAuth providers (Google, GitHub)
