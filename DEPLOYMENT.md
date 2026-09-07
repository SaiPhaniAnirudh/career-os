# Career OS — Cloud Deployment Guide

This guide walks you through deploying Career OS to production using **Render** (Backend) and **Vercel** (Frontend) with **Supabase** (Postgres + Auth) and **Groq** (Llama 3.3 70B AI).

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│               Frontend (Vercel)                        │
│          https://career-os.vercel.app                  │
│       Vanilla JS + Modern CSS + Vite SPA               │
└──────────────┬─────────────────────────┬───────────────┘
               │ HTTP / JWT              │ Supabase JS SDK
               ▼                         ▼
┌───────────────────────────────┐ ┌──────────────────────┐
│       Backend (Render)        │ │  Database + Auth     │
│ https://career-os.onrender.com│ │     (Supabase)       │
│     Flask + Gunicorn WSGI     │ │ Postgres DDL + RLS   │
└──────────────┬────────────────┘ └──────────────────────┘
               │ OpenAI-compatible API
               ▼
┌───────────────────────────────┐
│          Groq Cloud           │
│   llama-3.3-70b-versatile     │
└───────────────────────────────┘
```

---

## 🚀 Step 1: Deploy Backend to Render

1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** → **Blueprint** (or **Web Service**).
3. Connect your GitHub repository: `SaiPhaniAnirudh/career-os`.
4. Render will automatically detect the [render.yaml](render.yaml) configuration:
   - **Root Directory:** `backend`
   - **Environment:** `Python`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
   - **Health Check Path:** `/api/health`
5. Set the **Environment Variables** in Render:
   | Key | Value | Description |
   |---|---|---|
   | `SUPABASE_URL` | `https://dsfgnizwhzzadzurdrna.supabase.co` | Supabase project URL |
   | `SUPABASE_KEY` | *(Your Supabase anon key)* | Supabase anon JWT key |
   | `GROQ_API_KEY` | `gsk_...` | Groq API key |
   | `GROQ_MODEL` | `llama-3.3-70b-versatile` | LLM model |
   | `ALLOWED_ORIGINS` | `https://career-os.vercel.app,http://localhost:5173` | Allowed frontend domains |
   | `FLASK_ENV` | `production` | Production mode |
6. Click **Apply / Deploy**.
7. Once deployed, note down your Render backend URL (e.g. `https://career-os-backend.onrender.com`).
8. Verify health check:
   ```bash
   curl -i https://career-os-backend.onrender.com/api/health
   # Expected response: {"status": "ok"}
   ```

---

## ⚡ Step 2: Deploy Frontend to Vercel

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** → **Project**.
3. Import the repository: `SaiPhaniAnirudh/career-os`.
4. In the project setup screen:
   - **Framework Preset:** `Vite` (auto-detected)
   - **Root Directory:** Click "Edit" and choose `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Expand **Environment Variables** and add:
   | Key | Value |
   |---|---|
   | `VITE_API_BASE` | `https://career-os-backend.onrender.com` *(your Render backend URL)* |
   | `VITE_SUPABASE_URL` | `https://dsfgnizwhzzadzurdrna.supabase.co` |
   | `VITE_SUPABASE_KEY` | *(Your Supabase anon key)* |
6. Click **Deploy**.
7. Once deployed, Vercel will give you a live production URL (e.g. `https://career-os.vercel.app`).

---

## 🔐 Step 3: Finalize CORS & OAuth Redirects

### 1. Update Render Allowed Origins
Go to your Render backend service → **Environment** → edit `ALLOWED_ORIGINS`:
```
https://career-os.vercel.app,http://localhost:5173
```
Click **Save Changes** (triggers quick restart).

### 2. Update Supabase Authentication URL
In [Supabase Dashboard](https://app.supabase.com/):
1. Navigate to **Authentication** → **URL Configuration**.
2. Set **Site URL** to:
   ```
   https://career-os.vercel.app
   ```
3. In **Redirect URLs**, add:
   ```
   https://career-os.vercel.app/**
   http://localhost:5173/**
   ```
4. Click **Save**.

---

## 🔄 Automated CI/CD
A GitHub Actions workflow is preconfigured at `.github/workflows/ci.yml`. On every push to `master`, GitHub Actions automatically:
1. Runs the complete backend route test suite (`python tests/test_routes.py`).
2. Builds the frontend production bundle (`npm run build`).
3. Vercel and Render automatically deploy the verified commit.
