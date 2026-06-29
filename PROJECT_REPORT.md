# Project Report: PECTAA Image Resizer

This report outlines the implementation details, system architecture, local installation, deployment procedures, and custom domain connection guide for **"PECTAA Image Resizer"** built for **shahbaznetcafe.com**.

---

## 1. What Was Built

We have built a production-ready, full-stack web application designed for computer operators in SED Punjab schools. The app enables them to upload student or staff pictures, crop them interactively, auto-remove backgrounds, place subjects on clean white backgrounds, resize to exact 600x800 pixels, compress files strictly between **11 KB and 24 KB**, and download them as individual JPEGs or in a single ZIP file.

### Backend Architecture (FastAPI)
1. **API Endpoints**:
   - `GET /api/health`: Health monitoring endpoint.
   - `POST /api/session`: Records the school’s 8-digit EMIS code and the operator’s phone number. No password is required, maximizing convenience.
   - `POST /api/process-images`: Standard multipart endpoint validating file size (<= 10MB) and format (JPG, PNG, WEBP), executing image manipulation, generating zip files, and updating the processed count.
2. **SQLite Database**:
   - Stores EMIS, phone numbers, and running count of processed photos per school in a lightweight, self-contained `school_sessions` table.
3. **Advanced Image Processor**:
   - **Background Removal**: Integrates `rembg` which uses the U2Net deep learning model to separate subjects from background clutter.
   - **Centering & Aspect Padding**: Detects transparent bounding boxes, scales subjects proportionally to fit 75% of canvas height, and centers them on a pure white `600x800` RGB canvas.
   - **Dual-Constrained Compression**: Iteratively sweeps JPEG quality from 95 down to 5. If the file is still > 24KB (due to noise/texture), a light Gaussian blur is applied to remove high-frequency details. If the file size drops below 11KB (due to high compressibility), it appends a safe standard JPEG COM (Comment) segment with zero-padding bytes, ensuring the output is always between 11KB and 24KB.

### Frontend Interface (React + Vite + Tailwind CSS)
1. **Clean Stepper UI**: Guides operators visually through `Upload → Crop → Processing → Download` steps.
2. **Login/Record Form**: Standard input screen collecting school EMIS code and phone number with dual English and Urdu labels and validation messages.
3. **Interactive 3:4 Cropper**: Uses `react-easy-crop` to let operators crop each image inside a fixed 3:4 aspect ratio box (matching 600x800), optimizing composition before backend processing.
4. **Processing Loader**: Animated page showing progress checklists in Urdu and English.
5. **Interactive Gallery**: Previews final 600x800 white background JPEGs with their file sizes. Includes individual download links and a global "Download All ZIP" button.

---

## 2. How to Run Locally

### Prerequisites
- Install **Node.js** (v18 or higher)
- Install **Python** (v3.9 or higher)

### Backend Execution
1. Open a terminal and enter the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   The API will run on `http://127.0.0.1:8000`.

### Frontend Execution
1. Open a separate terminal and enter the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm modules:
   ```bash
   npm install
   ```
3. Launch Vite development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser. API requests are automatically proxied to port 8000.

### Running Backend Unit Tests
Execute the test script to check the resizing and 11KB-24KB compression logic:
```bash
python backend/test_image_processor.py
```

---

## 3. How to Deploy on Render

This project contains a `render.yaml` file that allows unified deployment as an Infrastructure-as-Code Blueprint.

1. Push this project to a **GitHub** repository.
2. Log into your **Render** dashboard (`https://dashboard.render.com/`).
3. Click **New** → **Blueprint**.
4. Select your connected GitHub repository and click **Approve**.
5. Render will automatically read `render.yaml` and create:
   - A Python Web Service for the FastAPI backend (`sed-punjab-resizer-backend`).
   - A Static Web Service for the React frontend (`sed-punjab-resizer-frontend`).
6. After backend deployment completes:
   - Copy your backend URL (e.g. `https://sed-punjab-resizer-backend.onrender.com`).
   - Navigate to the **Frontend** service in Render → **Environment**.
   - Add environment variable `VITE_API_URL` and set its value to your backend's URL.
   - Trigger a new deployment for the frontend static site to apply the settings.

---

## 4. How to Connect shahbaznetcafe.com

To host this application under your custom domain `shahbaznetcafe.com` or a subdomain like `resizer.shahbaznetcafe.com`:

1. In the **Render Dashboard**, click on your **Frontend Static Service** (`sed-punjab-resizer-frontend`).
2. Go to **Settings** → scroll down to **Custom Domains** → click **Add Custom Domain**.
3. Enter your domain: `shahbaznetcafe.com` (or `resizer.shahbaznetcafe.com`) and click **Save**.
4. Log into your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and update your DNS records:
   - **For Subdomain (recommended, e.g. `resizer.shahbaznetcafe.com`)**:
     - Type: `CNAME`
     - Name: `resizer`
     - Value: `sed-punjab-resizer-frontend.onrender.com`
     - TTL: `Automatic` or `3600`
   - **For Root Domain (`shahbaznetcafe.com`)**:
     - Type: `ANAME` or `ALIAS` (or CNAME if your DNS provider supports CNAME flattening on root)
     - Name: `@`
     - Value: `sed-punjab-resizer-frontend.onrender.com`
     - TTL: `Automatic` or `3600`
5. Wait for DNS propagation (takes 5 minutes to a few hours). Render will automatically generate a free Let's Encrypt SSL certificate and secure your site under HTTPS.

---

## 5. Known Limitations

1. **Rembg Performance on Cold Starts**:
   - The first image processed after a cold boot of the backend will experience a delay of 5-10 seconds while the backend downloads the U2Net machine learning model (176MB) and caches it. Subsequent runs are near-instant.
2. **Ephemeral Disk Storage**:
   - Render's free tier uses an ephemeral filesystem. The SQLite database file (`school_sessions.db`) will reset whenever the backend container restarts (e.g. on new deployments or inactivity sleep). If permanent history is required, attach a SQLite persistent disk or switch to a PostgreSQL database on Render.
3. **Browser Canvas Limitations**:
   - Client-side cropping relies on HTML5 canvas. Extremely old mobile browsers may fail to crop large 10MB images due to memory limits, though modern smartphones run it effortlessly.

---

## 6. Future Upgrade Ideas

1. **Persistent SQLite Disk or PostgreSQL**:
   - Hook up a PostgreSQL instance (Render offers PostgreSQL databases) to preserve school log records permanently.
2. **Model Pre-caching**:
   - Pre-install the `u2net.onnx` model inside the backend Docker/build image so that there is no downloading delay on the server's very first request.
3. **Admin Dashboard**:
   - Build a dashboard at `/admin` for `shahbaznetcafe.com` administrators to view logged schools, export CSV records, and monitor usage statistics.
4. **Language Selector Toggle**:
   - Although the UI is fully bilingual (combining English and Urdu), adding a clean language toggle button (English / اردو) would improve accessibility.
