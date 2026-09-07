# Career OS — AI-Powered Career Platform

🌐 **Live App:** [https://career-os-two-woad.vercel.app](https://career-os-two-woad.vercel.app)  
⚡ **Live API:** [https://career-os-backend-i375.onrender.com/api/health](https://career-os-backend-i375.onrender.com/api/health)

An AI-powered career & placement platform — resume/JD matching, mock interviews with voice, AI bullet optimization (Google XYZ / STAR), conversion funnel analytics, skill-gap tracking, and application tracking in one place.

## Stack

- **Backend:** Flask + Supabase (Postgres + Auth + RLS) + Groq API (Llama 3.3 70B)
- **Frontend:** Vite + Vanilla JS/CSS (dark glassmorphic SPA)
- **Auth:** Supabase JWT (email + password)
- **Deployment:** Zero-budget — free Supabase tier + free Groq API tier

## Status

- **Phase 0** — Repo, Supabase project, schema, RLS ✅
- **Phase 1** — Application tracker (full CRUD + kanban) + Resume/JD ingestion + keyword-overlap matcher ✅
- **Phase 2** — Mock interview engine (LLM-driven via Groq) ✅
- **Phase 3** — Skill gap tracker (`GET /api/skill-gaps` + full SPA dashboard) ✅
- **Phase 4** — Peer matchmaking (`/api/peers` + compatibility scoring + peer connect) ✅
- **Frontend** — Full premium SPA (login with OAuth, dashboard, kanban, matcher, skill gaps, chat interview, peer match) ✅

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
| `SUPABASE_KEY` | ✅ | Supabase anon key — legacy JWT format (`eyJ...`) |
| `GROQ_API_KEY` | for interview module only | Free key from [console.groq.com](https://console.groq.com). Applications and matching work without it |
| `GROQ_MODEL` | | Default: `llama-3.3-70b-versatile` |
| `ALLOWED_ORIGINS` | for prod | Comma-separated frontend origins for CORS. Defaults to Vite's local dev ports |
| `FLASK_ENV` | | Default: `development` |

Frontend variables (see `frontend/.env.example`):
- `VITE_API_BASE`: Backend API base URL (defaults to `http://localhost:5000`)
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anon key (`eyJ...`)

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
POST   /api/interview/start      (JSON {jd_id?, custom_topic?})
POST   /api/interview/respond    (JSON {session_id, answer})
POST   /api/interview/feedback   (JSON {session_id})
GET    /api/interview/sessions
GET    /api/skill-gaps
GET    /api/peers/me
POST   /api/peers/profile        (JSON {target_role, target_company, skills, ...})
GET    /api/peers                (discover peers with compatibility scoring)
POST   /api/peers/connect        (JSON {receiver_id, message})
GET    /api/peers/requests
PATCH  /api/peers/requests/<id>  (JSON {status: 'accepted' | 'declined'})
```

All routes except `/api/health` require `Authorization: Bearer <supabase-jwt>`.

## Database

SQL setup script located in [`supabase/schema.sql`](file:///c:/Users/pc/OneDrive/Desktop/career-os/supabase/schema.sql).

Tables:
- `resumes`
- `job_descriptions`
- `matches`
- `interview_sessions`
- `applications`
- `peer_profiles`
- `peer_requests`

All tables have Row Level Security (RLS) enabled so each user only ever accesses their own records (with peer discovery permitted for authenticated users).

## Frontend pages

| Page | Route | Description |
|------|-------|-------------|
| Login | `#/login` | Split-screen auth with email/password + Google & GitHub OAuth |
| Dashboard | `#/dashboard` | Stats overview, quick actions, skill gaps widget, recent activity |
| Applications | `#/applications` | Kanban board with salary, location, job URL, and drag-and-drop |
| Matcher | `#/matcher` | Resume upload + JD paste → animated match score, suggestions, report export |
| Skill Gaps | `#/skill-gaps` | Ranked missing skills aggregation across all your target job descriptions |
| Interview | `#/interview` | AI mock interview with role customization, past session history, transcript export |
| Peer Match | `#/peers` | Discover peer practice partners, view compatibility, send mock practice requests |

## Testing

```bash
cd backend
python tests/test_routes.py
```

Runs the 9-point route test suite exercising applications CRUD, auth enforcement, Groq decoupling, skill-gaps aggregation, extended application fields, interview session listing, stopword filtering, and peer matchmaking.

## Production Deployment

### 1. Database
Run [`supabase/schema.sql`](file:///c:/Users/pc/OneDrive/Desktop/career-os/supabase/schema.sql) in your [Supabase SQL Editor](https://app.supabase.com).

### 2. Backend (Render)
1. Push to GitHub and create a new Web Service on [Render](https://render.com) using the repo's [`render.yaml`](file:///c:/Users/pc/OneDrive/Desktop/career-os/render.yaml).
2. Set environment variables: `SUPABASE_URL`, `SUPABASE_KEY`, `GROQ_API_KEY`, and `ALLOWED_ORIGINS` (your frontend domain).

### 3. Frontend (Vercel / Netlify)
1. Connect your repository to [Vercel](https://vercel.com) or [Netlify](https://netlify.com) using the `frontend/` directory.
2. Set build command: `npm run build`, output directory: `dist`.
3. Add environment variable `VITE_API_BASE=https://your-backend-service.onrender.com`.
4. SPA routing rewrites are pre-configured in `vercel.json` and `netlify.toml`.

