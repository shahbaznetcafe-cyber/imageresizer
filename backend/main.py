import os
from typing import List
from datetime import datetime, timedelta
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Header, Request
from fastapi.middleware.cors import CORSMiddleware

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
        delete_limit_request,
        PendingLimitRequestError,
        get_or_create_device_limit,
        record_feedback,
        record_problem_report,
        record_school_error,
        record_processed_images,
        update_device_limit,
        update_processed_count,
        DATABASE_BACKEND,
        DISABLE_USAGE_LIMITS,
    )
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
        delete_limit_request,
        PendingLimitRequestError,
        get_or_create_device_limit,
        record_feedback,
        record_problem_report,
        record_school_error,
        record_processed_images,
        update_device_limit,
        update_processed_count,
        DATABASE_BACKEND,
        DISABLE_USAGE_LIMITS,
    )

# Initialize FastAPI application
app = FastAPI(title="PECTAA Image Resizer API")
SESSION_TTL_HOURS = int(os.getenv("SESSION_TTL_HOURS", "12"))
ADMIN_KEY = os.getenv("ADMIN_KEY", "")

# Configure CORS. Production origins are supplied by the host so the API can
# remain separate from the Vercel frontend without exposing browser credentials.
origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()

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


def is_all_zero_digits(value: str) -> bool:
    digits = "".join(filter(str.isdigit, value or ""))
    return bool(digits) and set(digits) == {"0"}


def is_blank_or_placeholder_text(value: str) -> bool:
    text = " ".join((value or "").strip().split())
    return not text or set(text) <= {"0"}


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
    request_ip = get_client_ip(request)
    raw_machine_id = (machine_id or "").strip()[:80]
    raw_machine_type = " ".join((machine_type or "").strip().split())[:120]

    # Validate EMIS code (should be numeric and exactly 8 digits)
    emis_cleaned = "".join(filter(str.isdigit, emis_code))
    if len(emis_cleaned) != 8:
        record_school_error(
            "invalid_emis",
            "Invalid EMIS code during login. EMIS must be exactly 8 digits.",
            emis_code=emis_cleaned or (emis_code or "")[:20],
            phone_number="".join(filter(str.isdigit, phone_number))[:30],
            school_name=school_name,
            machine_id=raw_machine_id,
            machine_type=raw_machine_type,
            ip_address=request_ip,
            severity="warning",
        )
        raise HTTPException(
            status_code=400,
            detail={
                "en": "Invalid EMIS Code. It must be exactly 8 digits.",
                "ur": "غلط ایمس کوڈ۔ یہ صرف 8 ہندسوں پر مشتمل ہونا چاہئے۔"
            }
        )

    if not DISABLE_USAGE_LIMITS and is_all_zero_digits(emis_cleaned):
        record_school_error(
            "placeholder_emis",
            "Placeholder EMIS code was refused during login.",
            emis_code=emis_cleaned,
            phone_number="".join(filter(str.isdigit, phone_number))[:30],
            school_name=school_name,
            machine_id=raw_machine_id,
            machine_type=raw_machine_type,
            ip_address=request_ip,
            severity="warning",
        )
        raise HTTPException(
            status_code=400,
            detail={
                "en": "Please enter the real School EMIS Code. Zero values are not allowed.",
                "ur": "Please enter the real School EMIS Code. Zero values are not allowed."
            }
        )
        
    # Validate Phone Number (basic length check, should have at least 10 digits)
    phone_cleaned = "".join(filter(str.isdigit, phone_number))
    if len(phone_cleaned) < 10 or len(phone_cleaned) > 15:
        record_school_error(
            "invalid_phone",
            "Invalid phone number during login. Phone must be 10-15 digits.",
            emis_code=emis_cleaned,
            phone_number=phone_cleaned,
            school_name=school_name,
            machine_id=raw_machine_id,
            machine_type=raw_machine_type,
            ip_address=request_ip,
            severity="warning",
        )
        raise HTTPException(
            status_code=400,
            detail={
                "en": "Invalid Phone Number. Please enter a valid 10-15 digit number.",
                "ur": "غلط فون نمبر۔ براہ کرم درست 10 سے 15 ہندسوں کا نمبر درج کریں۔"
            }
        )

    if not DISABLE_USAGE_LIMITS and is_all_zero_digits(phone_cleaned):
        record_school_error(
            "placeholder_phone",
            "Placeholder phone number was refused during login.",
            emis_code=emis_cleaned,
            phone_number=phone_cleaned,
            school_name=school_name,
            machine_id=raw_machine_id,
            machine_type=raw_machine_type,
            ip_address=request_ip,
            severity="warning",
        )
        raise HTTPException(
            status_code=400,
            detail={
                "en": "Please enter the real operator phone number. Zero values are not allowed.",
                "ur": "Please enter the real operator phone number. Zero values are not allowed."
            }
        )

    school_name_cleaned = " ".join((school_name or "").strip().split())[:120]
    machine_id_cleaned = raw_machine_id
    machine_type_cleaned = raw_machine_type
    ip_address = request_ip

    if (
        (not DISABLE_USAGE_LIMITS and is_blank_or_placeholder_text(school_name_cleaned))
        or (school_name and len(school_name_cleaned) < 2)
    ):
        record_school_error(
            "invalid_school_name",
            "Invalid or placeholder school name was refused during login.",
            emis_code=emis_cleaned,
            phone_number=phone_cleaned,
            school_name=school_name_cleaned,
            machine_id=machine_id_cleaned,
            machine_type=machine_type_cleaned,
            ip_address=ip_address,
            severity="warning",
        )
        raise HTTPException(
            status_code=400,
            detail={
                "en": "Please enter the real School Name.",
                "ur": "Please enter the real School Name."
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
        locked_device = device_result.get("device") or {}
        record_school_error(
            device_result.get("reason") or "device_locked",
            device_result["message"],
            emis_code=emis_cleaned,
            phone_number=phone_cleaned,
            school_name=school_name_cleaned,
            machine_id=machine_id_cleaned,
            machine_type=machine_type_cleaned,
            ip_address=ip_address,
            device_limit_id=locked_device.get("id"),
            severity="block",
            context=(
                f"Registered EMIS: {locked_device.get('emis_code') or 'N/A'}; "
                f"registered phone: {locked_device.get('phone_number') or 'N/A'}"
            ),
        )
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


@app.post("/api/problem-report")
async def api_problem_report(
    request: Request,
    emis_code: str = Form(...),
    phone_number: str = Form(...),
    school_name: str = Form(...),
    reporter_name: str = Form(default=""),
    problem_message: str = Form(default=""),
    machine_id: str = Form(default=""),
    machine_type: str = Form(default=""),
    screenshot: UploadFile | None = File(default=None),
):
    """Stores a school-submitted problem report with an optional screenshot."""
    emis_cleaned = "".join(filter(str.isdigit, emis_code or ""))
    phone_cleaned = "".join(filter(str.isdigit, phone_number or ""))
    school_cleaned = " ".join((school_name or "").strip().split())

    if len(emis_cleaned) != 8:
        raise HTTPException(status_code=400, detail="EMIS code must be exactly 8 digits.")
    if len(phone_cleaned) < 10 or len(phone_cleaned) > 15:
        raise HTTPException(status_code=400, detail="Phone number must be 10-15 digits.")
    if len(school_cleaned) < 2:
        raise HTTPException(status_code=400, detail="School name is required.")

    screenshot_name = ""
    screenshot_type = ""
    screenshot_data_url = ""

    if screenshot and screenshot.filename:
        screenshot_type = (screenshot.content_type or "").strip().lower()
        if not screenshot_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Screenshot must be an image file.")

        screenshot_bytes = await screenshot.read()
        max_screenshot_bytes = 3 * 1024 * 1024
        if len(screenshot_bytes) > max_screenshot_bytes:
            raise HTTPException(status_code=400, detail="Screenshot must be 3MB or smaller.")

        screenshot_name = os.path.basename(screenshot.filename)[:180]
        screenshot_data_url = (
            f"data:{screenshot_type or 'image/png'};base64,"
            + base64.b64encode(screenshot_bytes).decode("ascii")
        )

    report = record_problem_report(
        emis_code=emis_cleaned,
        phone_number=phone_cleaned,
        school_name=school_cleaned,
        reporter_name=reporter_name,
        problem_message=problem_message,
        screenshot_name=screenshot_name,
        screenshot_type=screenshot_type,
        screenshot_data_url=screenshot_data_url,
        machine_id=machine_id,
        machine_type=machine_type,
        ip_address=get_client_ip(request),
    )
    return {"success": True, "report": report}


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
    requested_extra: int = Form(default=150),
    payment_sender_name: str = Form(default=""),
    payment_sender_phone: str = Form(default=""),
    payment_transaction_id: str = Form(default=""),
    message: str = Form(default=""),
):
    """Stores a quota increase request for this machine after payment."""
    session = get_session(session_id)
    if not session or is_session_expired(session):
        raise HTTPException(status_code=404, detail="Session expired. Please log in again.")

    if not DISABLE_USAGE_LIMITS and (
        is_all_zero_digits(session.get("emis_code", ""))
        or is_all_zero_digits(session.get("phone_number", ""))
        or is_blank_or_placeholder_text(session.get("school_name", ""))
    ):
        record_school_error(
            "placeholder_limit_request",
            "Limit request refused because the session had placeholder school identity values.",
            session=session,
            severity="block",
            context="User must log in again with real EMIS, school name, and phone number.",
        )
        raise HTTPException(
            status_code=400,
            detail="Please log in again with real EMIS, school name, and phone number before sending a limit request.",
        )

    sender_phone_cleaned = "".join(filter(str.isdigit, payment_sender_phone or ""))
    if len(sender_phone_cleaned) < 10 or len(sender_phone_cleaned) > 15:
        raise HTTPException(status_code=400, detail="Payment sender phone must be 10-15 digits.")

    try:
        limit_request = create_limit_request(
            session,
            requested_extra,
            message,
            payment_sender_name=payment_sender_name,
            payment_sender_phone=sender_phone_cleaned,
            payment_transaction_id=payment_transaction_id,
        )
    except PendingLimitRequestError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
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


@app.post("/api/admin/limit-request/delete")
def api_admin_delete_limit_request(
    request_id: int = Form(...),
    x_admin_key: str = Header(default=""),
):
    """Removes a pending request that was submitted without a valid payment."""
    if not ADMIN_KEY or x_admin_key != ADMIN_KEY:
        raise HTTPException(status_code=401, detail="Invalid admin key.")
    if not delete_limit_request(request_id):
        raise HTTPException(status_code=404, detail="Pending limit request not found.")
    return {"success": True}


@app.post("/api/process-images")
async def api_process_images(
    background_tasks: BackgroundTasks,
    session_id: int = Form(...),
    files: List[UploadFile] = File(...)
):
    """
    Uploads, validates, processes, and compresses up to 15 images.
    If multiple files are uploaded, a ZIP is also created.
    Updates the session's processed count.
    """
    raise HTTPException(
        status_code=410,
        detail="Server-side image processing has moved to the browser. Please refresh the application.",
    )

    # Legacy implementation retained temporarily for rollback history only.
    # 1. Validate Session ID
    session = get_session(session_id)
    if not session or is_session_expired(session):
        if session:
            record_school_error(
                "session_expired",
                "Session expired while user tried to process images.",
                session=session,
                severity="warning",
            )
        raise HTTPException(
            status_code=404,
            detail={
                "en": "Session expired. Please log in again.",
                "ur": "سیشن نہیں ملا۔ براہ کرم دوبارہ لاگ ان کریں۔"
            }
        )
        
    # 2. Validate File Count
    if not files or len(files) < 1 or len(files) > 15:
        record_school_error(
            "invalid_file_count",
            "User tried to process an invalid number of images.",
            session=session,
            severity="warning",
            context=f"Submitted files: {len(files) if files else 0}",
        )
        raise HTTPException(
            status_code=400,
            detail={
                "en": "You must upload between 1 and 15 images.",
                "ur": "آپ کو 1 سے 15 تصاویر اپ لوڈ کرنی چاہئیں۔"
            }
        )

    quota_check = check_device_quota(session, len(files))
    if not quota_check["allowed"]:
        quota = quota_check.get("quota") or {}
        record_school_error(
            quota_check.get("reason") or "quota_error",
            quota_check["message"],
            session=session,
            severity="block",
            context=(
                f"Requested: {len(files)}; limit: {quota.get('photo_limit')}; "
                f"used: {quota.get('photos_used')}; remaining: {quota.get('remaining')}"
            ),
        )
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
        
        valid_extensions = {
            ".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".bmp", ".gif",
            ".jfif", ".avif", ".heic", ".heif",
        }
        valid_mimetypes = {
            "image/jpeg", "image/jpg", "image/png", "image/webp", "image/tiff",
            "image/bmp", "image/gif", "image/avif", "image/heic", "image/heif",
        }
        
        if ext not in valid_extensions and content_type not in valid_mimetypes:
            failure = {
                "original_name": filename,
                "reason": "Unsupported format. Please upload a valid image file.",
            }
            failed_images.append(failure)
            record_school_error(
                "unsupported_file_format",
                failure["reason"],
                session=session,
                severity="warning",
                context=f"File: {filename}; content_type: {content_type or 'unknown'}",
            )
            continue
            
        # Read file bytes to check size and process
        file_bytes = await upload_file.read()
        file_size = len(file_bytes)
        
        # Validate File Size (10MB limit)
        max_size_bytes = 10 * 1024 * 1024  # 10MB
        if file_size > max_size_bytes:
            failure = {
                "original_name": filename,
                "reason": "File exceeds the 10MB limit.",
            }
            failed_images.append(failure)
            record_school_error(
                "file_too_large",
                failure["reason"],
                session=session,
                severity="warning",
                context=f"File: {filename}; size_bytes: {file_size}",
            )
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
            failure = {
                "original_name": filename,
                "reason": f"Processing failed: {error_msg}",
            }
            failed_images.append(failure)
            record_school_error(
                "image_processing_error",
                failure["reason"],
                session=session,
                severity="error",
                context=f"File: {filename}",
            )
            
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
            record_school_error(
                "zip_creation_error",
                f"ZIP creation failed: {e}",
                session=session,
                severity="warning",
                context=f"Processed images in batch: {len(processed_images)}",
            )
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


@app.post("/api/record-processed-images")
def api_record_processed_images(
    session_id: int = Form(...),
    processed_images_json: str = Form(...),
):
    """Records browser-processed images without running AI inference on the server."""
    session = get_session(session_id)
    if not session or is_session_expired(session):
        raise HTTPException(status_code=404, detail="Session expired. Please log in again.")

    try:
        import json
        processed_images = json.loads(processed_images_json)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid processed image metadata.")

    if not isinstance(processed_images, list) or not processed_images or len(processed_images) > 15:
        raise HTTPException(status_code=400, detail="You must record between 1 and 15 images.")

    clean_images = []
    for image in processed_images:
        if not isinstance(image, dict):
            raise HTTPException(status_code=400, detail="Invalid processed image metadata.")
        original_name = os.path.basename(str(image.get("original_name") or "image.jpg"))[:180]
        processed_name = os.path.basename(str(image.get("processed_name") or "processed.jpg"))[:180]
        size_kb = float(image.get("size_kb") or 0)
        if not original_name or size_kb <= 0 or size_kb > 100:
            raise HTTPException(status_code=400, detail="Invalid processed image metadata.")
        clean_images.append({
            "original_name": original_name,
            "processed_name": processed_name,
            "url": "",
            "size_kb": round(size_kb, 2),
        })

    quota_check = check_device_quota(session, len(clean_images))
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

    record_processed_images(session, clean_images)
    new_count = update_processed_count(session_id, len(clean_images))
    quota = add_device_usage(session.get("device_limit_id"), len(clean_images))
    return {
        "success": True,
        "processed_count": len(clean_images),
        "total_session_count": new_count,
        "quota": quota,
    }

