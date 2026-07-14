# PECTAA Image Resizer

PECTAA Image Resizer is a production-ready, full-stack online web application built for **shahbaznetcafe.com**. It helps computer operators register their sessions (using School EMIS Code and Phone Number) and process student/staff pictures to official specifications:
- Auto-remove background (using `rembg`).
- Position subject on a pure white background.
- Center and scale the subject.
- Resize canvas to exact 600x800 pixels.
- Compress JPEG file size to strictly between **11 KB and 24 KB** (using optimized JPEG quality search and safe metadata padding segments to preserve visual quality).
- Download files individually or as a collective ZIP.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS v3, `react-easy-crop`
- **Backend**: FastAPI (Python), `rembg`, `pillow`, `sqlite3`
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

To test the image processing, centering, and compression size limits (11KB-24KB) locally:
1. Ensure your backend virtual environment is active.
2. Run the test script:
   ```bash
   python backend/test_image_processor.py
   ```

---

## Image Processing Speed Settings

The app is optimized to reduce generation time:
- The cropper uploads each crop as a final 600x800 JPEG, reducing network transfer and backend AI workload.
- The backend reuses one cached `rembg` model session instead of loading it repeatedly.
- JPEG compression uses a faster quality search instead of a long quality sweep.
- `PRELOAD_REMBG_MODEL=1` loads the model during server startup so the first user request is faster.
- `PROCESS_MAX_DIM=960` limits oversized images before background removal. Increase it only if you need slightly sharper edge detail at the cost of slower processing.

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

The Render free plan can sleep after inactivity, so the first image request after a quiet period may take longer. It is suitable for testing; use a paid Render instance before relying on it for busy school traffic.

### Manual Render Backend Settings

If you create the backend manually instead of using the Blueprint, use these settings:

- Service type: `Web Service`
- Runtime/language: `Python`
- Python version: `3.12`
- Build command: `pip install -r requirements.txt`
- Start command: `python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`

If Render logs show `Running build command 'yarn'` or `Running 'gunicorn --bind 0.0.0.0:$PORT wsgi:app'`, the service is using the wrong settings. Change it to the Python settings above, then redeploy.

If Render logs show `No onnxruntime backend found`, make sure the latest code is deployed. The backend uses `rembg[cpu]` so `onnxruntime` is installed for background removal.

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

The FastAPI backend is better hosted on Render, Railway, Fly.io, or another Python web-service host. Vercel serverless functions are not ideal for this backend because `rembg`/ONNX model loading is large, cold starts can be slow, and processed image files are temporary.

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
