import io
import sys
from PIL import Image

# Import the image processing functions
try:
    from image_processor import resize_and_center, compress_image_to_range, pad_jpeg_bytes
except ImportError:
    # Handle path issues if run from different dir
    import os
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from image_processor import resize_and_center, compress_image_to_range, pad_jpeg_bytes

def run_tests():
    print("Starting image processing tests...")

    # Test 1: Create a mock transparent RGBA image
    print("Test 1: Creating a mock transparent RGBA subject...")
    # 200x200 red square in a 500x500 transparent canvas
    rgba = Image.new("RGBA", (500, 500), (0, 0, 0, 0))
    subject = Image.new("RGBA", (200, 200), (255, 0, 0, 255))
    rgba.paste(subject, (150, 150))
    
    # Test 2: Verify resize_and_center
    print("Test 2: Testing resize_and_center...")
    canvas = resize_and_center(rgba, 600, 800)
    assert canvas.size == (600, 800), f"Expected 600x800 canvas, got {canvas.size}"
    assert canvas.mode == "RGB", f"Expected RGB canvas, got {canvas.mode}"
    print("  -> Passed: Centered canvas is exactly 600x800 RGB.")

    # Test 3: Verify compress_image_to_range
    print("Test 3: Testing compress_image_to_range (11KB to 24KB)...")
    # For a very simple image, the size will naturally be small.
    # Our function should compress it and pad it to the minimum limit (11.5 KB / ~11.8 KB).
    data = compress_image_to_range(canvas, min_kb=11, max_kb=24)
    size_kb = len(data) / 1024
    print(f"  -> Processed size: {size_kb:.2f} KB ({len(data)} bytes)")
    
    # Check constraints
    assert len(data) >= 11 * 1024, f"File size too small: {size_kb:.2f} KB (must be >= 11 KB)"
    assert len(data) <= 24 * 1024, f"File size too large: {size_kb:.2f} KB (must be <= 24 KB)"
    print("  -> Passed: Compressed size is within the 11KB - 24KB range.")
    
    # Double check that the compressed data is a valid JPEG
    try:
        loaded = Image.open(io.BytesIO(data))
        assert loaded.format == "JPEG", f"Expected JPEG format, got {loaded.format}"
        assert loaded.size == (600, 800), f"Expected JPEG size to be 600x800, got {loaded.size}"
        print("  -> Passed: Compressed bytes load as a valid 600x800 JPEG image.")
    except Exception as e:
        print(f"  -> Failed: Could not load compressed JPEG: {e}")
        sys.exit(1)

    print("\nAll unit tests passed successfully!")

if __name__ == "__main__":
    run_tests()
