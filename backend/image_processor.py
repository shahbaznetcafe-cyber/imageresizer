import io
import os
import tempfile
from math import ceil
from threading import Lock
from typing import Optional
from PIL import Image, ImageFilter, ImageOps


def configure_writable_runtime_cache():
    """Point model/cache libraries at /tmp on read-only serverless hosts."""
    if not os.getenv("VERCEL"):
        return

    runtime_root = os.path.join(tempfile.gettempdir(), "pectaa_runtime")
    cache_root = os.path.join(runtime_root, "cache")
    paths = {
        "HOME": runtime_root,
        "XDG_CACHE_HOME": cache_root,
        "U2NET_HOME": os.path.join(runtime_root, "u2net"),
        "NUMBA_CACHE_DIR": os.path.join(cache_root, "numba"),
        "MPLCONFIGDIR": os.path.join(cache_root, "matplotlib"),
    }

    for key, path in paths.items():
        os.environ[key] = path
        os.makedirs(path, exist_ok=True)


configure_writable_runtime_cache()

PROCESS_MAX_DIM = int(os.getenv("PROCESS_MAX_DIM", "960"))
REMBG_MODEL = os.getenv("REMBG_MODEL", "u2net")
SUBJECT_MARGIN_PX = int(os.getenv("SUBJECT_MARGIN_PX", "3"))
_rembg_session = None
_rembg_session_lock = Lock()


def get_rembg_session():
    """Create one shared rembg session and avoid duplicate cold-start model loads."""
    global _rembg_session

    if _rembg_session is None:
        with _rembg_session_lock:
            if _rembg_session is None:
                from rembg import new_session

                _rembg_session = new_session(REMBG_MODEL)

    return _rembg_session


def remove_background(image: Image.Image) -> Image.Image:
    """Remove the background using the cached rembg session."""
    from rembg import remove

    return remove(image, session=get_rembg_session())


def warm_image_processor():
    """Preload the background-removal model when the server opts in."""
    get_rembg_session()

def crop_subject_bounding_box(rgba_image: Image.Image) -> Image.Image:
    """
    Crops the image tightly to the bounding box of the non-transparent subject.
    Returns the original if no subject is found.
    """
    if rgba_image.mode != "RGBA":
        rgba_image = rgba_image.convert("RGBA")

    alpha = rgba_image.getchannel("A")
    mask = alpha.point(lambda value: 255 if value > 10 else 0)
    bbox = mask.getbbox()

    if not bbox:
        return rgba_image

    return rgba_image.crop(bbox)


def resize_and_center(cropped_subject: Image.Image, target_w: int = 600, target_h: int = 800) -> Image.Image:
    """
    Resizes the subject to cover the canvas while keeping a small white margin.
    The subject is not distorted; extra width is center-cropped and extra height
    is cropped from the bottom to keep the face/top area safe.
    """
    subj_w, subj_h = cropped_subject.size
    margin = max(0, min(SUBJECT_MARGIN_PX, target_w // 4, target_h // 4))
    inner_w = target_w - (margin * 2)
    inner_h = target_h - (margin * 2)

    # Fill 90% of height and 88% of width — more body visible
    max_subj_h = inner_h
    max_subj_w = inner_w

    scale_w = max_subj_w / subj_w
    scale_h = max_subj_h / subj_h
    scale = max(scale_w, scale_h)

    new_w = max(1, ceil(subj_w * scale))
    new_h = max(1, ceil(subj_h * scale))

    resized_subj = cropped_subject.resize((new_w, new_h), Image.Resampling.LANCZOS)
    crop_x = max(0, (new_w - inner_w) // 2)
    crop_box = (
        crop_x,
        0,
        min(crop_x + inner_w, new_w),
        min(inner_h, new_h),
    )
    fitted_subj = resized_subj.crop(crop_box)

    # Pure white background canvas
    background = Image.new("RGB", (target_w, target_h), (255, 255, 255))

    # Paste using alpha mask, leaving the configured margin on all sides.
    background.paste(fitted_subj, (margin, margin), mask=fitted_subj.split()[3])

    return background


def pad_jpeg_bytes(jpeg_data: bytes, min_size: int = 11 * 1024) -> bytes:
    """
    Pads JPEG bytes with a safe JPEG COM (Comment) segment to meet the minimum
    size requirement. COM segments are silently ignored by all JPEG decoders.
    """
    if len(jpeg_data) >= min_size:
        return jpeg_data

    needed = min_size - len(jpeg_data)
    if needed <= 4:
        needed = 5

    content_len = needed - 4

    if jpeg_data.endswith(b'\xff\xd9'):
        prefix = jpeg_data[:-2]
        suffix = b'\xff\xd9'
    else:
        prefix = jpeg_data
        suffix = b''

    length_bytes = content_len + 2
    length_high = (length_bytes >> 8) & 0xFF
    length_low = length_bytes & 0xFF

    com_segment = b'\xff\xfe' + bytes([length_high, length_low]) + b'\x00' * content_len
    return prefix + com_segment + suffix


def compress_image_to_range(img: Image.Image, min_kb: int = 11, max_kb: int = 24) -> bytes:
    """
    Compresses an RGB PIL Image to JPEG, targeting strictly between min_kb and max_kb.
    Uses a binary search over JPEG quality to reduce repeated encode passes.
    If below min_kb, pads safely with JPEG COM segment bytes.
    """
    min_bytes = min_kb * 1024
    max_bytes = max_kb * 1024

    def save_jpeg(source_img: Image.Image, quality: int) -> bytes:
        buf = io.BytesIO()
        source_img.save(
            buf,
            format="JPEG",
            quality=quality,
            optimize=True,
            subsampling=2,
        )
        return buf.getvalue()

    def best_under_limit(source_img: Image.Image) -> Optional[bytes]:
        low, high = 5, 95
        best = None

        while low <= high:
            quality = (low + high) // 2
            data = save_jpeg(source_img, quality)
            if len(data) <= max_bytes:
                best = data
                low = quality + 1
            else:
                high = quality - 1

        return best

    data = best_under_limit(img)
    if data:
        if len(data) >= min_bytes:
            return data
        return pad_jpeg_bytes(data, min_bytes + 512)

    # Apply a very light blur to reduce file size on highly textured images.
    blurred = img.filter(ImageFilter.GaussianBlur(radius=0.8))
    data = best_under_limit(blurred)
    if data:
        if len(data) >= min_bytes:
            return data
        return pad_jpeg_bytes(data, min_bytes + 512)

    # Last resort: palette quantization
    quantized = img.quantize(colors=64).convert("RGB")
    data = save_jpeg(quantized, 5)

    if len(data) >= min_bytes:
        return data
    return pad_jpeg_bytes(data, min_bytes + 512)


def process_single_image(image_bytes: bytes) -> bytes:
    """
    Full pipeline:
    1. Load and downscale input before AI inference.
    2. Remove background with rembg (default u2net model — proven reliable).
    3. Crop to subject bounding box.
    4. Center on pure white 600x800 canvas with 90% fill.
    5. Compress JPEG to strictly 11KB–24KB.
    """
    # 1. Load image
    input_img = Image.open(io.BytesIO(image_bytes))
    input_img = ImageOps.exif_transpose(input_img)

    # Convert to RGBA for rembg
    if input_img.mode != "RGBA":
        input_img = input_img.convert("RGBA")

    # 2. Speed optimization: downscale large images before AI runs
    w, h = input_img.size
    if max(w, h) > PROCESS_MAX_DIM:
        scale = PROCESS_MAX_DIM / max(w, h)
        input_img = input_img.resize(
            (int(w * scale), int(h * scale)),
            Image.Resampling.LANCZOS
        )

    # 3. Remove background (default u2net model — works on every rembg version)
    bg_removed = remove_background(input_img)

    # 4. Crop tight to the visible subject
    cropped = crop_subject_bounding_box(bg_removed)

    # 5. Resize + center on white 600x800 canvas
    canvas = resize_and_center(cropped, 600, 800)

    # 6. Compress to 11KB – 24KB
    return compress_image_to_range(canvas, 11, 24)
