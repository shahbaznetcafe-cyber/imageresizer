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

## Deployment to Render

This repository is equipped with a `render.yaml` blueprint file for easy, unified deployment.

1. Connect your GitHub repository to Render.
2. Click **New** → **Blueprint** on your Render Dashboard.
3. Select your repository. Render will automatically detect the `render.yaml` configuration and set up:
   - A static site for the React frontend.
   - A Python web service for the FastAPI backend.
4. **Update Frontend Environment Variable**:
   - Once the backend service is deployed, copy its URL (e.g., `https://sed-punjab-resizer-backend.onrender.com`).
   - Go to your Frontend service settings in Render, add the environment variable `VITE_API_URL` and set its value to your backend's URL.
   - Re-deploy the frontend service.

### Manual Render Backend Settings

If you create the backend manually instead of using the Blueprint, use these settings:

- Service type: `Web Service`
- Runtime/language: `Python`
- Python version: `3.13.5`
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
