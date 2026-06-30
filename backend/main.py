import os
import tempfile
import uuid
import zipfile
from typing import List
from datetime import datetime, timedelta
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool

# Import database and image processor modules.
# The fallback keeps local `uvicorn main:app` usage working from the backend folder.
try:
    from .database import (
        init_db,
        create_session,
        get_activity_summary,
        get_session,
        record_processed_images,
        update_processed_count,
        DATABASE_BACKEND,
    )
    from .image_processor import process_single_image, warm_image_processor
except ImportError:
    from database import (
        init_db,
        create_session,
        get_activity_summary,
        get_session,
        record_processed_images,
        update_processed_count,
        DATABASE_BACKEND,
    )
    from image_processor import process_single_image, warm_image_processor

# Initialize FastAPI application
app = FastAPI(title="PECTAA Image Resizer API")

# Configure CORS
origins = [
    "http://localhost:5173",  # React dev server
    "http://127.0.0.1:5173",
    "https://shahbaznetcafe.com",
    "https://www.shahbaznetcafe.com",
    "https://sed-punjab-photo-resizer.onrender.com"  # Render domain placeholder
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for API accessibility, can restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure processed files directory exists. Vercel's code directory is read-only,
# so temporary processed files must live under /tmp there.
PROCESSED_DIR = os.getenv(
    "PROCESSED_DIR",
    os.path.join(tempfile.gettempdir(), "processed_temp")
    if os.getenv("VERCEL")
    else os.path.join(os.path.dirname(os.path.abspath(__file__)), "processed_temp")
)
os.makedirs(PROCESSED_DIR, exist_ok=True)

# Mount static files to serve processed images
app.mount("/processed", StaticFiles(directory=PROCESSED_DIR), name="processed")

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()
    if os.getenv("PRELOAD_REMBG_MODEL", "1").lower() in {"1", "true", "yes", "on"}:
        try:
            warm_image_processor()
        except Exception as e:
            print(f"Background-removal model preload failed: {e}")

# Helper function to delete old files (older than 1 hour)
def cleanup_old_files():
    """Removes files in PROCESSED_DIR that are older than 1 hour to free disk space."""
    now = datetime.now()
    threshold = now - timedelta(hours=1)
    
    for filename in os.listdir(PROCESSED_DIR):
        file_path = os.path.join(PROCESSED_DIR, filename)
        if os.path.isfile(file_path):
            file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
            if file_mtime < threshold:
                try:
                    os.remove(file_path)
                except Exception as e:
                    print(f"Error deleting file {file_path}: {e}")

@app.get("/api/health")
@app.get("/health")  # alias for compatibility
def health_check():
    """Health check endpoint to verify server is running."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "database": "connected",
        "database_backend": DATABASE_BACKEND
    }

@app.post("/api/session")
def api_create_session(
    emis_code: str = Form(...),
    phone_number: str = Form(...)
):
    """
    Creates a new user session.
    Validates EMIS code (8 digits) and Phone Number.
    No password required.
    """
    # Validate EMIS code (should be numeric and exactly 8 digits)
    emis_cleaned = "".join(filter(str.isdigit, emis_code))
    if len(emis_cleaned) != 8:
        raise HTTPException(
            status_code=400,
            detail={
                "en": "Invalid EMIS Code. It must be exactly 8 digits.",
                "ur": "غلط ایمس کوڈ۔ یہ صرف 8 ہندسوں پر مشتمل ہونا چاہئے۔"
            }
        )
        
    # Validate Phone Number (basic length check, should have at least 10 digits)
    phone_cleaned = "".join(filter(str.isdigit, phone_number))
    if len(phone_cleaned) < 10 or len(phone_cleaned) > 15:
        raise HTTPException(
            status_code=400,
            detail={
                "en": "Invalid Phone Number. Please enter a valid 10-15 digit number.",
                "ur": "غلط فون نمبر۔ براہ کرم درست 10 سے 15 ہندسوں کا نمبر درج کریں۔"
            }
        )
        
    session = create_session(emis_cleaned, phone_number)
    return session


@app.get("/api/activity")
def api_activity():
    """Returns live landing-page activity stats and recent image records."""
    return get_activity_summary()

@app.post("/api/process-images")
async def api_process_images(
    background_tasks: BackgroundTasks,
    session_id: int = Form(...),
    files: List[UploadFile] = File(...)
):
    """
    Uploads, validates, processes, and compresses up to 10 images.
    If multiple files are uploaded, a ZIP is also created.
    Updates the session's processed count.
    """
    # 1. Validate Session ID
    session = get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail={
                "en": "Session not found. Please log in again.",
                "ur": "سیشن نہیں ملا۔ براہ کرم دوبارہ لاگ ان کریں۔"
            }
        )
        
    # 2. Validate File Count
    if not files or len(files) < 1 or len(files) > 10:
        raise HTTPException(
            status_code=400,
            detail={
                "en": "You must upload between 1 and 10 images.",
                "ur": "آپ کو 1 سے 10 تصاویر اپ لوڈ کرنی چاہئیں۔"
            }
        )
        
    # Schedule folder cleanup as a background task
    background_tasks.add_task(cleanup_old_files)
    
    processed_images = []
    temp_file_paths = []
    
    # 3. Process Each Image
    for idx, upload_file in enumerate(files):
        # Validate File Type
        content_type = upload_file.content_type
        filename = upload_file.filename or "image.jpg"
        ext = os.path.splitext(filename)[1].lower()
        
        valid_extensions = {".jpg", ".jpeg", ".png", ".webp"}
        valid_mimetypes = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
        
        if ext not in valid_extensions and content_type not in valid_mimetypes:
            raise HTTPException(
                status_code=400,
                detail={
                    "en": f"Unsupported format for '{filename}'. Only JPG, JPEG, PNG, and WEBP are allowed.",
                    "ur": f"فائل '{filename}' کا فارمیٹ غیر تعاون یافتہ ہے۔ صرف JPG, JPEG, PNG اور WEBP کی اجازت ہے۔"
                }
            )
            
        # Read file bytes to check size and process
        file_bytes = await upload_file.read()
        file_size = len(file_bytes)
        
        # Validate File Size (10MB limit)
        max_size_bytes = 10 * 1024 * 1024  # 10MB
        if file_size > max_size_bytes:
            raise HTTPException(
                status_code=400,
                detail={
                    "en": f"File '{filename}' exceeds the 10MB limit.",
                    "ur": f"فائل '{filename}' 10MB کی حد سے زیادہ ہے۔"
                }
            )
            
        try:
            # Process image (remove background, scale/center on 600x800 white canvas, compress to 11KB-24KB)
            processed_data = await run_in_threadpool(process_single_image, file_bytes)
            
            # Generate unique filename
            unique_id = str(uuid.uuid4())
            processed_filename = f"processed_{unique_id}.jpg"
            processed_path = os.path.join(PROCESSED_DIR, processed_filename)
            
            # Save processed image
            with open(processed_path, "wb") as f:
                f.write(processed_data)
                
            temp_file_paths.append(processed_path)
            
            # Add to response array
            processed_images.append({
                "original_name": filename,
                "processed_name": processed_filename,
                "url": f"/processed/{processed_filename}",
                "size_kb": round(len(processed_data) / 1024, 2)
            })
            
        except BaseException as e:
            # Catch ALL exceptions including SystemExit from onnxruntime
            # so the server process itself never dies
            for path in temp_file_paths:
                try:
                    if os.path.exists(path):
                        os.remove(path)
                except Exception:
                    pass
            error_msg = str(e) if str(e) else type(e).__name__
            raise HTTPException(
                status_code=500,
                detail={
                    "en": f"Error processing image '{filename}': {error_msg}",
                    "ur": f"تصویر '{filename}' کو پروسیس کرنے میں خرابی پیش آئی: {error_msg}"
                }
            )
            
    # 4. Generate ZIP if multiple images
    zip_url = None
    if len(processed_images) > 1:
        zip_id = str(uuid.uuid4())
        zip_filename = f"sed_punjab_{session['emis_code']}_{zip_id}.zip"
        zip_path = os.path.join(PROCESSED_DIR, zip_filename)
        
        try:
            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
                for img in processed_images:
                    img_path = os.path.join(PROCESSED_DIR, img["processed_name"])
                    # Use original name with .jpg extension for the files inside ZIP
                    name_in_zip = os.path.splitext(img["original_name"])[0] + ".jpg"
                    zipf.write(img_path, arcname=name_in_zip)
                    
            zip_url = f"/processed/{zip_filename}"
        except Exception as e:
            print(f"Error creating ZIP: {e}")
            # Non-fatal error: user can still download individually
            
    # 5. Save image records and update processed count in database
    record_processed_images(session, processed_images)
    new_count = update_processed_count(session_id, len(processed_images))
    
    return {
        "success": True,
        "processed_count": len(processed_images),
        "total_session_count": new_count,
        "images": processed_images,
        "zip_url": zip_url,
        "activity": get_activity_summary()
    }
