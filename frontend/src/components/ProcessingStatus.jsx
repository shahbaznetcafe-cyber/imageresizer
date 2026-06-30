import React from 'react';
import { Loader2, ShieldCheck, Sparkles, Image, CheckCircle2 } from 'lucide-react';

export default function ProcessingStatus() {
  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl border border-slate-100 shadow-xl p-8 text-center space-y-6">
      {/* Animated Loading Icon */}
      <div className="relative mx-auto w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center">
        <Loader2 className="animate-spin text-punjab-blue" size={48} />
        <div className="absolute inset-0 border-4 border-punjab-green/20 rounded-full animate-ping pointer-events-none"></div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-bold text-slate-700 tracking-tight">Processing Images</h3>
        <p className="urdu-text text-sm text-slate-500 leading-3">تصاویر پروسیس ہو رہی ہیں...</p>
      </div>

      {/* Steps Check list */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/50 text-left space-y-3.5 max-w-sm mx-auto">
        <div className="flex items-center gap-3 text-slate-600 text-xs font-semibold">
          <CheckCircle2 size={16} className="text-punjab-green shrink-0" />
          <div className="flex-1">
            <p>1. Uploaded successfully</p>
            <p className="urdu-text text-[10px] text-slate-400 leading-3">کامیابی سے اپ لوڈ ہو گیا</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-600 text-xs font-semibold">
          <Sparkles size={16} className="text-punjab-blue shrink-0 animate-pulse" />
          <div className="flex-1">
            <p>2. Removing background (rembg)</p>
            <p className="urdu-text text-[10px] text-slate-400 leading-3">پس منظر ہٹایا جا رہا ہے</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-400 text-xs font-semibold">
          <Image size={16} className="shrink-0" />
          <div className="flex-1">
            <p>3. Resizing to 600x800 & white background</p>
            <p className="urdu-text text-[10px] text-slate-400 leading-3">سائز تبدیل اور سفید بیک گراؤنڈ</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-400 text-xs font-semibold">
          <ShieldCheck size={16} className="shrink-0" />
          <div className="flex-1">
            <p>4. Compressing strictly to 11KB - 24KB</p>
            <p className="urdu-text text-[10px] text-slate-400 leading-3">سائز 11 سے 24 کلو بائٹ کے درمیان</p>
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-400 font-medium">
        Please do not close this window. Larger batches can take up to 60-90 seconds while the server prepares each image.
      </div>
    </div>
  );
}
