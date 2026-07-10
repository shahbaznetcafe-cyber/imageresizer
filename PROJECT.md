# Project Overview

## Product

PECTAA Image Resizer is a full-stack web app for school/computer operators. It records a school session and processes uploaded photos to official 600x800 JPEG output with white background and target file size between 11 KB and 24 KB.

## Stack

- Frontend: React, Vite, Tailwind CSS, `react-easy-crop`
- Backend: FastAPI, Pillow, rembg, SQLite by default, optional PostgreSQL/Supabase through `DATABASE_URL`
- Deployment notes: Render blueprint for backend plus static frontend; optional Vercel frontend/backend config exists

## Important Paths

- Backend app: `backend/main.py`
- Database layer: `backend/database.py`
- Image processing: `backend/image_processor.py`
- Frontend app shell: `frontend/src/App.jsx`
- API URL helper: `frontend/src/utils/api.js`
- Frontend package: `frontend/package.json`
- Backend requirements: `backend/requirements.txt`
- Local personal launcher: `start-personal-unlimited.bat`

## Current Git State At First Checkpoint

As of 2026-07-09 13:43:12 +05:00:

- Branch: `main` tracking `origin/main`
- Modified before this checkpoint: `backend/database.py`
- Untracked before this checkpoint: `PECTAA-Personal-Unlimited-NoLogin-20260703-150515/`, `PERSONAL-UNLIMITED-README.txt`, `personal_school_sessions.db`, `start-personal-unlimited.bat`
- Git warning observed: unable to access `C:\Users\shahbaz/.config/git/ignore` due to permission denied

Do not discard the existing modified/untracked work without user approval.

