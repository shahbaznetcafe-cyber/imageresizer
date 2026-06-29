import React from 'react';
import { Download, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';

export default function ResultGallery({ results, zipUrl, onReset }) {
  const baseUrl = import.meta.env.VITE_API_URL || '';

  const handleDownload = (url, name) => {
    // Force download by creating a temporary link
    const link = document.createElement('a');
    link.href = `${baseUrl}${url}`;
    link.download = name || 'processed_photo.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-50 rounded-full text-punjab-green shrink-0">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Compressed Successfully</h3>
            <p className="urdu-text text-[11px] leading-3 text-slate-400 mt-1">تمام تصاویر کامیابی کے ساتھ تیار ہو گئی ہیں</p>
            <p className="text-xs text-slate-500 mt-1">
              All images have been adjusted to 600x800 px and fit within the <span className="font-semibold text-punjab-green">11KB - 24KB</span> size range.
            </p>
          </div>
        </div>
        
        {zipUrl && (
          <button
            onClick={() => handleDownload(zipUrl, 'sed_punjab_photos.zip')}
            className="w-full sm:w-auto bg-punjab-green hover:bg-punjab-green-dark text-white font-bold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all-custom flex items-center justify-center gap-2 text-sm shrink-0"
          >
            <Download size={18} />
            <div className="flex flex-col items-start leading-none text-left">
              <span className="text-sm font-semibold tracking-wide">Download All ZIP</span>
              <span className="urdu-text text-[9px] leading-none text-white/80 font-normal">زپ فائل ڈاؤن لوڈ کریں</span>
            </div>
          </button>
        )}
      </div>

      {/* Grid of processed images */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {results.map((img, index) => {
          const isSizeValid = img.size_kb >= 11 && img.size_kb <= 24;

          return (
            <div
              key={index}
              className="bg-white rounded-2xl border border-slate-100 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col"
            >
              {/* Image Preview Container */}
              <div className="relative aspect-[3/4] bg-slate-100 flex items-center justify-center p-2 border-b border-slate-100">
                <img
                  src={`${baseUrl}${img.url}`}
                  alt={img.original_name}
                  className="w-full h-full object-contain bg-white rounded-lg shadow-sm border border-slate-200"
                />
                
                {/* Size Badge */}
                <div className={`absolute bottom-4 right-4 px-2.5 py-1 rounded-full text-xs font-mono font-bold text-white shadow-sm flex items-center gap-1 ${
                  isSizeValid ? 'bg-punjab-green' : 'bg-red-500'
                }`}>
                  {img.size_kb} KB
                </div>
              </div>

              {/* Info & Download Footer */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-700 truncate" title={img.original_name}>
                    {img.original_name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">600 x 800 pixels | JPG</p>
                  
                  {!isSizeValid && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-red-500 font-semibold">
                      <AlertTriangle size={12} />
                      <span>Size outside 11-24KB constraint!</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDownload(img.url, img.original_name)}
                  className="w-full flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors"
                >
                  <Download size={14} className="text-punjab-blue" />
                  Download Image
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Process More Section */}
      <div className="flex justify-center pt-4">
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-slate-500 hover:text-punjab-blue font-semibold text-sm py-2 px-4 rounded-xl hover:bg-slate-100/80 transition-colors group"
        >
          <RotateCcw size={16} className="group-hover:rotate-45 transition-transform" />
          <span>Upload More Images</span>
          <span className="urdu-text text-[11px] leading-3 text-slate-400 font-normal ml-1">مزید تصاویر اپ لوڈ کریں</span>
        </button>
      </div>
    </div>
  );
}
