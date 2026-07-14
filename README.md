# PECTAA Image Resizer

PECTAA Image Resizer is a production-ready, full-stack online web application built for **shahbaznetcafe.com**. It helps computer operators register their sessions (using School EMIS Code and Phone Number) and process student/staff pictures to official specifications:
- Auto-remove background in the operator's browser (using Transformers.js and MODNet).
- Position subject on a pure white background.
- Center and scale the subject.
- Resize canvas to exact 600x800 pixels.
- Compress JPEG file size to strictly between **11 KB and 24 KB** (using optimized JPEG quality search and safe metadata padding segments to preserve visual quality).
- Download files individually or as a collective ZIP.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS v3, `react-easy-crop`
- **Backend**: FastAPI for sessions, quotas, and records; Supabase PostgreSQL in production
- **Database**: SQLite (for session tracking)

---

## Local Development Setup

### 1. Prerequisites
- Node.js (v18+)
- Python (v3.9+)

### 2. Backend Setup
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the backend server locally:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   The backend will run on `http://127.0.0.1:8000`. The SQLite database file `school_sessions.db` will be initialized automatically.

### 3. Frontend Setup
1. Open another terminal in the project root and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:5173`. Requests to `/api` and `/processed` will be automatically proxied to the backend at port 8000.

---

## Running Automated Tests

Run the frontend production checks:

```bash
cd frontend
npm run lint
npm run build
```

For an end-to-end check, start the app, process one normal JPG in Chrome or Edge, confirm the downloaded image is 600x800 and 11-24 KB, then verify the admin count increased.

---

## Browser Image Processing

Background removal, 600x800 composition, JPEG compression, and ZIP generation now run in the operator's browser. The image itself is not uploaded to Render, so the Render Free 512 MB instance does not load `rembg` or ONNX at all.

The first image on a browser downloads and caches the MODNet model. Keep the crop screen open until it has finished preparing; later batches on the same browser are faster. Chrome and Edge on a normal desktop/laptop are the supported operator browsers. The backend receives only the result name and size so quotas, Supabase records, and the private admin panel remain accurate.

Render Free can still sleep after inactivity, so login or quota recording may take a moment after 15 minutes of no traffic. This no longer affects the actual image background-removal workload and cannot cause the previous 512 MB model out-of-memory failure.

---

## Private Admin Records

The app stores each login session and processed-image count in the backend database. Public activity stats never show phone numbers. To view the private EMIS and phone records:

1. Set `ADMIN_KEY` on the backend host to a strong private value.
2. Redeploy the backend.
3. Open the frontend login page.
4. Click **Admin Login** at the bottom-left of the login card.
5. Paste the same `ADMIN_KEY` into the admin form and click **Load Records**.

The records page can export CSV with EMIS code, phone number, session date, and image counts.

---

## Deployment to Render

This repository is equipped with a `render.yaml` blueprint for both the FastAPI backend and React frontend. It replaces the paused Vercel deployment so image processing does not consume Vercel Fluid Active CPU.

1. Push the latest `main` branch to GitHub, then connect the repository to Render.
2. Click **New** → **Blueprint** on your Render Dashboard.
3. Select the repository. Render will detect `render.yaml` and create the Python backend service plus a static frontend service.
4. During Blueprint setup, provide these secrets. Do not put them in Git:
   - `DATABASE_URL`: the Supabase Session pooler PostgreSQL connection string from Supabase Dashboard Connect. Render is an IPv4 service, so do not use a Supabase direct connection unless your Supabase project has IPv4 enabled.
   - `ADMIN_KEY`: the same strong private value used for the admin records screen.
5. Wait for the Render service to become live, then open `https://your-render-service.onrender.com/api/health`. It should return `database_backend: "supabase_postgres"`.
6. Open the Render frontend URL and check that login and image processing work. The frontend is configured to call the Render backend automatically.
7. In the Render frontend service, add `pectaa.shahbaznetcafe.com` under **Custom Domains**. Update the domain DNS record to the Render value shown in that screen.

The Render free plan can sleep after inactivity, so the first image request after a quiet period may take longer. This Blueprint uses the lightweight model/profile required by the 512 MB free instance; use a paid Render instance before relying on it for busy school traffic.

### Manual Render Backend Settings

If you create the backend manually instead of using the Blueprint, use these settings:

- Service type: `Web Service`
- Runtime/language: `Python`
- Python version: `3.11.11` or newer
- Build command: `pip install -r requirements.txt`
- Start command: `python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`

If Render logs show `Running build command 'yarn'` or `Running 'gunicorn --bind 0.0.0.0:$PORT wsgi:app'`, the service is using the wrong settings. Change it to the Python settings above, then redeploy.

The backend no longer installs `rembg` or ONNX. If an old browser build calls `/api/process-images`, refresh the frontend so it uses the browser processing workflow.

The repository also includes a root `wsgi.py` compatibility entry so Render's default `gunicorn --bind 0.0.0.0:$PORT wsgi:app` command can boot the FastAPI app. The `uvicorn` start command above is still recommended.

---

## Connecting shahbaznetcafe.com Domain

To hook this tool up to your domain:
1. In the Render Dashboard, go to your **Frontend** Static Site service.
2. Click on **Settings** → **Custom Domains**.
3. Click **Add Custom Domain** and enter `shahbaznetcafe.com` (or a subdomain like `resizer.shahbaznetcafe.com`).
4. Update your DNS settings at your domain registrar:
   - For a subdomain (e.g., `resizer.shahbaznetcafe.com`), create a **CNAME** record pointing to the Render frontend URL (e.g., `sed-punjab-resizer-frontend.onrender.com`).
   - For a root domain (e.g., `shahbaznetcafe.com`), create an **ALIAS** or **ANAME** record pointing to the Render frontend URL.
5. Render will automatically issue a free Let's Encrypt SSL Certificate and connect the domain.

---

## GitHub + Vercel Deployment Notes

For GitHub, commit the source code only. Generated files such as `frontend/node_modules`, `frontend/dist`, `backend/school_sessions.db`, and `backend/processed_temp` are intentionally ignored by the root `.gitignore`.

For Vercel, deploy the **frontend**:
1. Push this project to GitHub.
2. Create a new Vercel project from the GitHub repository.
3. Set the Vercel project root directory to `frontend`.
4. Use:
   ```bash
   npm install
   npm run build
   ```
5. Set `VITE_API_URL` in Vercel Environment Variables to your live backend URL.
   - Example: `VITE_API_URL=https://your-backend-name.onrender.com`
   - After changing this variable, redeploy the Vercel project.

Vercel hosts only the frontend. Login, school records, image processing, and dashboard activity require the FastAPI backend to be live and connected through `VITE_API_URL`.

The FastAPI backend can run on a small Render service because it only manages sessions, quotas, feedback, and Supabase records. Image processing is intentionally client-side to avoid server CPU and memory charges.

### Optional Vercel Backend Settings

The repository includes `api/index.py` and `vercel.json` so Vercel can route backend API requests to the FastAPI app.

For a separate Vercel backend project:

- Root Directory: `./`
- Build Command: `pip install -r requirements.txt`
- Output Directory: leave blank
- Install Command: leave blank
- Environment Variable: `PYTHON_VERSION=3.12`
- Environment Variable: `PRELOAD_REMBG_MODEL=0`
- Environment Variable: `REMBG_MODEL=u2netp`
- Environment Variable: `ADMIN_KEY=your-private-admin-key`

After the backend deploys, set the frontend project's `VITE_API_URL` to the backend Vercel URL and redeploy the frontend.
