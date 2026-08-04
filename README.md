# Career OS

An AI-powered career & placement platform — resume/JD matching, mock interviews, skill-gap tracking, and application tracking in one place.

Successor to [NutriTrack], built on the same zero-budget stack philosophy: Flask + Supabase + Ollama-hosted LLM, deployable for free.

## Status

Phases 0–2 scaffolded:
- **Phase 0** — repo, Supabase project, schema, RLS ✅
- **Phase 1** — Application tracker (full CRUD) + Resume/JD ingestion + keyword-overlap matcher (heuristic placeholder ahead of the embedding-based RAG matcher) ✅
- **Phase 2** — Mock interview engine (LLM-driven, via Ollama) ✅ scaffolded, needs a deployed Ollama endpoint to actually run
- **Phase 3** — Skill gap tracker — not started
- **Phase 4** — Peer matchmaking (stretch) — not started

## Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in SUPABASE_URL / SUPABASE_KEY if different
python app.py
```

Health check: `GET http://localhost:5000/api/health`

## Environment variables

See `backend/.env.example`. `SUPABASE_URL` and `SUPABASE_KEY` are pre-filled for the `career-os` Supabase project (using the public anon key — safe to commit, RLS enforces per-user access).

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

Tables: `resumes`, `job_descriptions`, `matches`, `interview_sessions`, `applications` — all with Row Level Security so each user only ever sees their own rows. Schema lives in Supabase migrations (see project dashboard).

## Next steps

1. Deploy the Ollama LLM endpoint (Hugging Face Spaces, same setup as NutriTrack)
2. Swap the Phase 1 keyword-overlap matcher for embedding-based similarity (pgvector columns are already in place)
3. Build the frontend (PWA, same pattern as NutriTrack)
4. Phase 3: skill-gap tracker (derives mostly from existing match data)
