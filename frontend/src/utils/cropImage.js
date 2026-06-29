/**
 * Utility to crop an image on the client side using HTML5 Canvas.
 * Returns a Promise that resolves with a File object containing the cropped image.
 */
export async function getCroppedImg(imageSrc, pixelCrop, fileName) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Export at the final required size to reduce upload and backend AI work.
  canvas.width = 600;
  canvas.height = 800;

  // Draw cropped image onto canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    600,
    800
  );

  // Return a promise that resolves with the cropped File object
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      // Create a File object from the blob
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      resolve(file);
    }, 'image/jpeg', 0.92);
  });
}

/**
 * Helper to create an HTML Image element from a source URL
 */
function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // avoid cors issues for canvas
    image.src = url;
  });
}
