import { describe, expect, it, vi } from 'vitest';
import {
  createBackgroundRemover,
  createBackgroundRemoverLoader,
} from './clientImageProcessor';

function createTransformers(pipeline) {
  return {
    pipeline,
    env: {
      allowLocalModels: true,
      backends: { onnx: { versions: { web: '1.24.0' }, wasm: {} } },
    },
  };
}

describe('browser background-removal backend selection', () => {
  it('uses WebGPU only after a valid adapter is returned', async () => {
    const pipeline = vi.fn().mockResolvedValue('webgpu-remover');
    const gpu = { requestAdapter: vi.fn().mockResolvedValue({}) };

    await expect(createBackgroundRemover({ transformers: createTransformers(pipeline), gpu })).resolves.toBe('webgpu-remover');
    expect(pipeline).toHaveBeenCalledWith('background-removal', 'Xenova/modnet', { dtype: 'fp32', device: 'webgpu' });
  });

  it('uses WASM when an Android browser exposes WebGPU but returns no adapter', async () => {
    const pipeline = vi.fn().mockResolvedValue('wasm-remover');
    const gpu = { requestAdapter: vi.fn().mockResolvedValue(null) };

    await expect(createBackgroundRemover({ transformers: createTransformers(pipeline), gpu })).resolves.toBe('wasm-remover');
    expect(pipeline).toHaveBeenCalledWith('background-removal', 'Xenova/modnet', { dtype: 'fp32', device: 'wasm' });
    const transformers = createTransformers(pipeline);
    await createBackgroundRemover({ transformers, gpu });
    expect(transformers.env.allowLocalModels).toBe(false);
    expect(transformers.env.backends.onnx.wasm.wasmPaths.wasm).toContain('onnxruntime-web@1.24.0');
  });

  it('uses WASM when requestAdapter throws', async () => {
    const pipeline = vi.fn().mockResolvedValue('wasm-remover');
    const gpu = { requestAdapter: vi.fn().mockRejectedValue(new Error('adapter unavailable')) };

    await expect(createBackgroundRemover({ transformers: createTransformers(pipeline), gpu })).resolves.toBe('wasm-remover');
    expect(pipeline).toHaveBeenLastCalledWith('background-removal', 'Xenova/modnet', { dtype: 'fp32', device: 'wasm' });
  });

  it('uses WASM when WebGPU pipeline initialization fails', async () => {
    const pipeline = vi.fn()
      .mockRejectedValueOnce(new Error('webgpu initialization failed'))
      .mockResolvedValueOnce('wasm-remover');
    const gpu = { requestAdapter: vi.fn().mockResolvedValue({}) };

    await expect(createBackgroundRemover({ transformers: createTransformers(pipeline), gpu })).resolves.toBe('wasm-remover');
    expect(pipeline).toHaveBeenNthCalledWith(1, 'background-removal', 'Xenova/modnet', { dtype: 'fp32', device: 'webgpu' });
    expect(pipeline).toHaveBeenNthCalledWith(2, 'background-removal', 'Xenova/modnet', { dtype: 'fp32', device: 'wasm' });
  });

  it('shows a clean error when WASM cannot initialize', async () => {
    const pipeline = vi.fn().mockRejectedValue(new Error('wasm unavailable'));

    await expect(createBackgroundRemover({ transformers: createTransformers(pipeline), gpu: undefined }))
      .rejects.toThrow('Background removal could not start on this device. Please refresh and try again.');
  });

  it('clears a rejected initialization promise so the next attempt can retry', async () => {
    const createRemover = vi.fn()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce('retry-remover');
    const getRemover = createBackgroundRemoverLoader(createRemover);

    await expect(getRemover()).rejects.toThrow('temporary failure');
    await expect(getRemover()).resolves.toBe('retry-remover');
    expect(createRemover).toHaveBeenCalledTimes(2);
  });
});
