const DEFAULT_TARGET_WIDTH = 600;
const DEFAULT_TARGET_HEIGHT = 800;
const SUBJECT_MARGIN_PX = 3;
const MIN_OUTPUT_BYTES = 11 * 1024;
const MAX_OUTPUT_BYTES = 24 * 1024;

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error('The browser could not create the image output.'));
    }, type, quality);
  });
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The background-removed image could not be read.'));
    image.src = source;
  });
}

export async function createBackgroundRemover(dependencies = {}) {
  const transformers = dependencies.transformers || await import('@huggingface/transformers');
  const { pipeline, env } = transformers;
  const gpu = dependencies.gpu ?? globalThis.navigator?.gpu;

  env.allowLocalModels = false;
  const onnxVersion = env.backends.onnx.versions?.web;
  const wasmBaseUrl = onnxVersion
    ? `https://cdn.jsdelivr.net/npm/onnxruntime-web@${onnxVersion}/dist/`
    : 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';
  env.backends.onnx.wasm.wasmPaths = {
    mjs: `${wasmBaseUrl}ort-wasm-simd-threaded.asyncify.mjs`,
    wasm: `${wasmBaseUrl}ort-wasm-simd-threaded.asyncify.wasm`,
  };

  const commonOptions = { dtype: 'fp32' };

  if (gpu?.requestAdapter) {
    try {
      const adapter = await gpu.requestAdapter();
      if (adapter) {
        return await pipeline('background-removal', 'Xenova/modnet', {
          ...commonOptions,
          device: 'webgpu',
        });
      }
    } catch (error) {
      console.warn('WebGPU initialization failed; switching to WASM.', error);
    }
  }

  try {
    return await pipeline('background-removal', 'Xenova/modnet', {
      ...commonOptions,
      device: 'wasm',
    });
  } catch (error) {
    console.error('WASM background removal failed.', error);
    throw new Error('Background removal could not start on this device. Please refresh and try again.');
  }
}

export function createBackgroundRemoverLoader(createRemover) {
  let removerPromise;

  return async () => {
    if (!removerPromise) {
      removerPromise = createRemover();
    }

    try {
      return await removerPromise;
    } catch (error) {
      removerPromise = undefined;
      throw error;
    }
  };
}

const getBackgroundRemover = createBackgroundRemoverLoader(createBackgroundRemover);

export async function prepareClientBackgroundRemoval() {
  await getBackgroundRemover();
}

function getSubjectBounds(imageData) {
  const { data, width, height } = imageData;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 10) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }

  if (right < left || bottom < top) {
    throw new Error('No person was detected. Please use a clear photo with a visible person.');
  }

  return {
    x: left,
    y: top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

function refineAlphaEdges(imageData) {
  const { data, width, height } = imageData;
  const pixelCount = width * height;
  const alpha = new Uint8ClampedArray(pixelCount);
  for (let i = 0; i < pixelCount; i += 1) alpha[i] = data[i * 4 + 3];

  // Erode: strip the outer ring of the matte so background-colour fringe
  // (halo) left over from the AI cutout does not carry into the composite.
  const eroded = new Uint8ClampedArray(alpha);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      if (alpha[idx] === 0) continue;
      const left = x > 0 ? alpha[idx - 1] : 0;
      const right = x < width - 1 ? alpha[idx + 1] : 0;
      const top = y > 0 ? alpha[idx - width] : 0;
      const bottom = y < height - 1 ? alpha[idx + width] : 0;
      if (left === 0 || right === 0 || top === 0 || bottom === 0) {
        eroded[idx] = 0;
      }
    }
  }

  // Feather: a 3x3 box blur on the alpha channel only, smoothing jagged
  // pixel-mask edges into a soft studio-style cutout.
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          sum += eroded[ny * width + nx];
          count += 1;
        }
      }
      data[idx * 4 + 3] = Math.round(sum / count);
    }
  }
}

async function createSizedJpeg(
  transparentImageBlob,
  backgroundColor = '#ffffff',
  targetWidth = DEFAULT_TARGET_WIDTH,
  targetHeight = DEFAULT_TARGET_HEIGHT,
) {
  const sourceUrl = URL.createObjectURL(transparentImageBlob);
  try {
    const image = await loadImage(sourceUrl);
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = image.naturalWidth || image.width;
    sourceCanvas.height = image.naturalHeight || image.height;
    const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
    if (!sourceContext) throw new Error('Your browser does not support canvas image processing.');

    sourceContext.drawImage(image, 0, 0, sourceCanvas.width, sourceCanvas.height);
    const sourceImageData = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    refineAlphaEdges(sourceImageData);
    sourceContext.putImageData(sourceImageData, 0, 0);
    const bounds = getSubjectBounds(sourceImageData);
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = targetWidth;
    outputCanvas.height = targetHeight;
    const outputContext = outputCanvas.getContext('2d');
    if (!outputContext) throw new Error('Your browser does not support canvas image processing.');

    outputContext.fillStyle = backgroundColor;
    outputContext.fillRect(0, 0, targetWidth, targetHeight);

    const innerWidth = targetWidth - SUBJECT_MARGIN_PX * 2;
    const innerHeight = targetHeight - SUBJECT_MARGIN_PX * 2;
    const scale = Math.max(innerWidth / bounds.width, innerHeight / bounds.height);
    const drawWidth = bounds.width * scale;
    const drawHeight = bounds.height * scale;
    const drawX = SUBJECT_MARGIN_PX + (innerWidth - drawWidth) / 2;
    const drawY = SUBJECT_MARGIN_PX + (innerHeight - drawHeight) / 2;

    outputContext.drawImage(
      sourceCanvas,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      drawX,
      drawY,
      drawWidth,
      drawHeight,
    );

    let best = await canvasToBlob(outputCanvas, 'image/jpeg', 0.92);
    for (let quality = 0.88; quality >= 0.1; quality -= 0.06) {
      const candidate = await canvasToBlob(outputCanvas, 'image/jpeg', quality);
      if (candidate.size <= MAX_OUTPUT_BYTES) {
        best = candidate;
        break;
      }
      best = candidate;
    }

    return padJpegToMinimum(best);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

async function padJpegToMinimum(blob) {
  if (blob.size >= MIN_OUTPUT_BYTES) return blob;

  const original = new Uint8Array(await blob.arrayBuffer());
  const paddingSize = MIN_OUTPUT_BYTES - original.length;
  if (paddingSize > 65533 || original.length < 2) return blob;

  const comment = new Uint8Array(paddingSize + 4);
  comment[0] = 0xff;
  comment[1] = 0xfe;
  const segmentLength = paddingSize + 2;
  comment[2] = (segmentLength >> 8) & 0xff;
  comment[3] = segmentLength & 0xff;

  return new Blob([original.slice(0, -2), comment, original.slice(-2)], { type: 'image/jpeg' });
}

export async function processImageInBrowser(file, options = {}) {
  const {
    backgroundColor = '#ffffff',
    width = DEFAULT_TARGET_WIDTH,
    height = DEFAULT_TARGET_HEIGHT,
  } = options;

  const remover = await getBackgroundRemover();
  const sourceUrl = URL.createObjectURL(file);

  try {
    const output = await remover(sourceUrl);
    const transparentImage = Array.isArray(output) ? output[0] : output;
    const transparentImageBlob = await transparentImage.toBlob();
    return createSizedJpeg(transparentImageBlob, backgroundColor, width, height);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('The browser could not prepare the image preview.'));
    reader.readAsDataURL(blob);
  });
}
