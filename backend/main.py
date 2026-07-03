import base64
import os
import tempfile
import uuid
import zipfile
from typing import List
from datetime import datetime, timedelta
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Header, Request
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
        get_admin_records,
        get_session,
        add_device_usage,
        check_device_quota,
        create_limit_request,
        get_or_create_device_limit,
        record_feedback,
        record_processed_images,
        update_device_limit,
        update_processed_count,
        DATABASE_BACKEND,
    )
    from .image_processor import process_single_image, warm_image_processor
except ImportError:
    from database import (
        init_db,
        create_session,
        get_activity_summary,
        get_admin_records,
        get_session,
        add_device_usage,
        check_device_quota,
        create_limit_request,
        get_or_create_device_limit,
        record_feedback,
        record_processed_images,
        update_device_limit,
        update_processed_count,
        DATABASE_BACKEND,
    )
    from image_processor import process_single_image, warm_image_processor

# Initialize FastAPI application
app = FastAPI(title="PECTAA Image Resizer API")
SESSION_TTL_HOURS = int(os.getenv("SESSION_TTL_HOURS", "2"))
ADMIN_KEY = os.getenv("ADMIN_KEY", "")

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
    default_preload = "0" if os.getenv("VERCEL") else "1"
    if os.getenv("PRELOAD_REMBG_MODEL", default_preload).lower() in {"1", "true", "yes", "on"}:
        try:
            warm_image_processor()
        except Exception as e:
            print(f"Background-removal model preload failed: {e}")

# Helper function to delete old files after the session window.
def cleanup_old_files():
    """Removes files in PROCESSED_DIR that are older than the session window."""
    now = datetime.now()
    threshold = now - timedelta(hours=SESSION_TTL_HOURS)
    
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


@app.post("/api/warmup")
def api_warmup(background_tasks: BackgroundTasks):
    """Starts model loading early so image processing is faster after login."""
    background_tasks.add_task(warm_image_processor)
    return {"status": "warming"}


def is_session_expired(session: dict) -> bool:
    created_at = session.get("created_at")
    if not created_at:
        return False

    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))

    if created_at.tzinfo is not None:
        created_at = created_at.replace(tzinfo=None)

    return datetime.utcnow() - created_at > timedelta(hours=SESSION_TTL_HOURS)


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()[:80]
    return (
        request.headers.get("cf-connecting-ip")
        or request.headers.get("x-real-ip")
        or (request.client.host if request.client else "")
        or ""
    )[:80]


@app.post("/api/session")
def api_create_session(
    request: Request,
    emis_code: str = Form(...),
    phone_number: str = Form(...),
    school_name: str = Form(default=""),
    machine_id: str = Form(default=""),
    machine_type: str = Form(default="")
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

    school_name_cleaned = " ".join((school_name or "").strip().split())[:120]
    machine_id_cleaned = (machine_id or "").strip()[:80]
    machine_type_cleaned = " ".join((machine_type or "").strip().split())[:120]
    ip_address = get_client_ip(request)

    if school_name and len(school_name_cleaned) < 2:
        raise HTTPException(
            status_code=400,
            detail={
                "en": "School Name must be at least 2 characters.",
                "ur": "School Name must be at least 2 characters."
            }
        )

    device_result = get_or_create_device_limit(
        emis_cleaned,
        phone_cleaned,
        school_name_cleaned,
        machine_id_cleaned,
        machine_type_cleaned,
        ip_address,
    )
    if not device_result["allowed"]:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "device_locked",
                "en": device_result["message"],
                "ur": device_result["message"],
                "quota": device_result.get("quota", {}),
            },
        )

    session = create_session(
        emis_cleaned,
        phone_cleaned,
        school_name_cleaned,
        machine_id_cleaned,
        machine_type_cleaned,
        ip_address,
        device_result["device"]["id"],
    )
    session["quota"] = device_result["quota"]
    return session


@app.get("/api/activity")
def api_activity():
    """Returns live landing-page activity stats and recent image records."""
    return get_activity_summary()


@app.get("/api/admin/records")
def api_admin_records(x_admin_key: str = Header(default="")):
    """Returns private EMIS/phone records after admin-key verification."""
    if not ADMIN_KEY or x_admin_key != ADMIN_KEY:
        raise HTTPException(status_code=401, detail="Invalid admin key.")
    return get_admin_records()


@app.post("/api/feedback")
def api_feedback(
    session_id: int = Form(...),
    rating: int = Form(default=0),
    category: str = Form(default=""),
    message: str = Form(...),
):
    """Stores school/operator feedback for the admin dashboard."""
    session = get_session(session_id)
    if not session or is_session_expired(session):
        raise HTTPException(
            status_code=404,
            detail="Session expired. Please log in again before sending feedback.",
        )

    clean_message = (message or "").strip()
    if len(clean_message) < 5:
        raise HTTPException(status_code=400, detail="Please write at least 5 characters.")

    feedback = record_feedback(
        session=session,
        rating=rating,
        category=category,
        message=clean_message,
    )
    return {"success": True, "feedback": feedback}


@app.post("/api/limit-request")
def api_limit_request(
    session_id: int = Form(...),
    requested_extra: int = Form(default=50),
    message: str = Form(default=""),
):
    """Stores a quota increase request after the free limit is reached."""
    session = get_session(session_id)
    if not session or is_session_expired(session):
        raise HTTPException(status_code=404, detail="Session expired. Please log in again.")

    limit_request = create_limit_request(session, requested_extra, message)
    return {"success": True, "request": limit_request}


@app.post("/api/admin/device-limit")
def api_admin_device_limit(
    device_limit_id: int = Form(...),
    photo_limit: int = Form(...),
    request_id: int | None = Form(default=None),
    x_admin_key: str = Header(default=""),
):
    """Allows admin to increase or reset a device photo quota."""
    if not ADMIN_KEY or x_admin_key != ADMIN_KEY:
        raise HTTPException(status_code=401, detail="Invalid admin key.")
    device = update_device_limit(device_limit_id, photo_limit, request_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device limit record not found.")
    return {"success": True, "device": device}


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
    if not session or is_session_expired(session):
        raise HTTPException(
            status_code=404,
            detail={
                "en": "Session expired. Please log in again.",
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

    quota_check = check_device_quota(session, len(files))
    if not quota_check["allowed"]:
        raise HTTPException(
            status_code=403,
            detail={
                "code": quota_check["reason"],
                "en": quota_check["message"],
                "ur": quota_check["message"],
                "quota": quota_check["quota"],
            },
        )
        
    # Schedule folder cleanup as a background task
    background_tasks.add_task(cleanup_old_files)
    
    processed_images = []
    failed_images = []
    
    # 3. Process Each Image
    for upload_file in files:
        # Validate File Type
        content_type = upload_file.content_type
        filename = upload_file.filename or "image.jpg"
        ext = os.path.splitext(filename)[1].lower()
        
        valid_extensions = {".jpg", ".jpeg", ".png", ".webp"}
        valid_mimetypes = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
        
        if ext not in valid_extensions and content_type not in valid_mimetypes:
            failed_images.append({
                "original_name": filename,
                "reason": "Unsupported format. Only JPG, JPEG, PNG, and WEBP are allowed.",
            })
            continue
            
        # Read file bytes to check size and process
        file_bytes = await upload_file.read()
        file_size = len(file_bytes)
        
        # Validate File Size (10MB limit)
        max_size_bytes = 10 * 1024 * 1024  # 10MB
        if file_size > max_size_bytes:
            failed_images.append({
                "original_name": filename,
                "reason": "File exceeds the 10MB limit.",
            })
            continue
            
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
                
            # Add to response array
            processed_images.append({
                "original_name": filename,
                "processed_name": processed_filename,
                "url": f"/processed/{processed_filename}",
                "data_url": f"data:image/jpeg;base64,{base64.b64encode(processed_data).decode('ascii')}",
                "size_kb": round(len(processed_data) / 1024, 2)
            })
            
        except BaseException as e:
            # Catch ALL exceptions including SystemExit from onnxruntime
            # so the server process itself never dies
            error_msg = str(e) if str(e) else type(e).__name__
            failed_images.append({
                "original_name": filename,
                "reason": f"Processing failed: {error_msg}",
            })
            
    # 4. Generate ZIP if multiple images
    zip_url = None
    zip_data_url = None
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
            with open(zip_path, "rb") as zip_file:
                zip_data_url = (
                    "data:application/zip;base64,"
                    + base64.b64encode(zip_file.read()).decode("ascii")
                )
        except Exception as e:
            print(f"Error creating ZIP: {e}")
            # Non-fatal error: user can still download individually
            
    # 5. Save image records and update processed count in database
    record_processed_images(session, processed_images)
    new_count = update_processed_count(session_id, len(processed_images))
    quota = add_device_usage(session.get("device_limit_id"), len(processed_images))
    
    return {
        "success": len(processed_images) > 0,
        "processed_count": len(processed_images),
        "failed_count": len(failed_images),
        "total_session_count": new_count,
        "quota": quota,
        "images": processed_images,
        "failed_images": failed_images,
        "zip_url": zip_url,
        "zip_data_url": zip_data_url,
        "activity": get_activity_summary()
    }

