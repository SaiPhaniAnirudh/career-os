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
- **Frontend** — Full premium SPA (login, dashboard, kanban, matcher, chat interview) ✅
- **Phase 3** — Skill gap tracker — not started
- **Phase 4** — Peer matchmaking (stretch) — not started

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
| `SUPABASE_KEY` | ✅ | Supabase anon (public) key |
| `GROQ_API_KEY` | ✅ | Free Groq API key from [console.groq.com](https://console.groq.com) |
| `GROQ_MODEL` | | Default: `llama-3.3-70b-versatile` |
| `FLASK_ENV` | | Default: `development` |

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

## Next steps

1. Get a free Groq API key and add it to `.env`
2. Phase 3: Skill-gap tracker (derives from match data)
3. Deploy frontend (Vercel / Netlify / GitHub Pages)
4. Add OAuth providers (Google, GitHub)
