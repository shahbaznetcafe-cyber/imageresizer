import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, ShieldCheck, Sparkles, Image, CheckCircle2, Files, Pin } from 'lucide-react';

export default function ProcessingStatus({ files = [] }) {
  const totalFiles = Math.max(files.length, 1);
  const [processedEstimate, setProcessedEstimate] = useState(0);

  useEffect(() => {
    setProcessedEstimate(0);

    const lastVisibleCount = Math.max(totalFiles - 1, 1);
    const intervalMs = Math.max(2200, Math.min(5200, Math.round(70000 / totalFiles)));
    const timer = window.setInterval(() => {
      setProcessedEstimate((current) => Math.min(current + 1, lastVisibleCount));
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [totalFiles]);

  const activeFile = useMemo(() => {
    if (!files.length) return 'Preparing images';
    const index = Math.min(processedEstimate, files.length - 1);
    return files[index]?.originalName || files[index]?.file?.name || `Image ${index + 1}`;
  }, [files, processedEstimate]);

  const workingOn = Math.min(processedEstimate + 1, totalFiles);
  const progressPercent = Math.max(8, Math.min(96, Math.round((workingOn / totalFiles) * 100)));

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-2xl border border-slate-100 shadow-xl p-8 text-center space-y-6">
      <div className="relative mx-auto w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center">
        <Loader2 className="animate-spin text-punjab-blue" size={48} />
        <div className="absolute inset-0 border-4 border-punjab-green/20 rounded-full animate-ping pointer-events-none" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-bold text-slate-700 tracking-tight">Processing Images</h3>
        <p className="text-sm text-slate-500">Please wait while your photos are resized and compressed.</p>
      </div>

      <div className="bg-gradient-to-r from-punjab-blue to-punjab-green rounded-2xl p-4 text-white shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 text-left">
            <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Files size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-bold text-white/75">Processed Estimate</p>
              <p className="text-sm font-semibold truncate" title={activeFile}>
                {activeFile}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-2xl font-black tracking-tight">{workingOn}/{totalFiles}</p>
            <p className="text-[10px] font-semibold text-white/75">files</p>
          </div>
        </div>

        <div className="mt-4 h-2.5 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-white shadow-sm transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/50 text-left space-y-3.5 max-w-sm mx-auto">
        <div className="flex items-center gap-3 text-slate-600 text-xs font-semibold">
          <CheckCircle2 size={16} className="text-punjab-green shrink-0" />
          <div className="flex-1">
            <p>1. Uploaded successfully</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-600 text-xs font-semibold">
          <Sparkles size={16} className="text-punjab-blue shrink-0 animate-pulse" />
          <div className="flex-1">
            <p>2. Removing background</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-400 text-xs font-semibold">
          <Image size={16} className="shrink-0" />
          <div className="flex-1">
            <p>3. Resizing to 600x800 with white background</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-400 text-xs font-semibold">
          <ShieldCheck size={16} className="shrink-0" />
          <div className="flex-1">
            <p>4. Compressing to 11KB - 24KB</p>
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-400 font-medium">
        Please do not close this window. Larger batches can take up to 60-90 seconds while the server prepares each image.
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-left space-y-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-8 w-8 rounded-xl bg-white text-amber-600 flex items-center justify-center shrink-0 shadow-sm">
            <Pin size={16} />
          </div>
          <div className="min-w-0 space-y-3">
            <div dir="rtl" className="urdu-text text-right text-xs leading-6 text-slate-700">
              <p className="font-bold text-slate-800">📌 نوٹ</p>
              <p>
                پہلی بار براہِ کرم صرف ایک تصویر اپ لوڈ کریں۔ چونکہ پہلی مرتبہ پروسیسنگ ماڈل لوڈ ہوتا ہے، اس لیے اس عمل میں تقریباً 60 سے 90 سیکنڈ لگ سکتے ہیں۔ ماڈل لوڈ ہونے کے بعد آپ باآسانی ایک ساتھ متعدد (Bulk) تصاویر اپ لوڈ کر سکتے ہیں، اور پروسیسنگ کافی تیز ہو جائے گی۔
              </p>
            </div>

            <div className="text-xs leading-5 text-slate-600">
              <p className="font-bold text-slate-800">📌 Note</p>
              <p>
                For the first use, please upload only one image. The processing model loads initially, so it may take approximately 60-90 seconds. After the model has loaded, you can upload multiple bulk images and processing will be significantly faster.
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400">
        Workflow optimized by <span className="text-punjab-green">SBZ Tech</span>
      </p>
    </div>
  );
}
