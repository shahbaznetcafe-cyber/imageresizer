import React, { useEffect, useMemo, useState } from 'react';
import { Download, CheckCircle2, RotateCcw, AlertTriangle, ExternalLink, Sparkles } from 'lucide-react';
import { getApiUrl } from '../utils/api';

function getRetryUrl(url, retryCount) {
  if (!url || /^data:/i.test(url) || retryCount === 0) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}preview_retry=${retryCount}&t=${Date.now()}`;
}

function ImagePreview({ image, getAssetUrl }) {
  const sources = useMemo(() => {
    return [image.data_url, image.url]
      .filter(Boolean)
      .map(getAssetUrl)
      .filter((value, index, list) => value && list.indexOf(value) === index);
  }, [getAssetUrl, image.data_url, image.url]);

  const [sourceIndex, setSourceIndex] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [hasFailed, setHasFailed] = useState(!sources.length);

  useEffect(() => {
    setSourceIndex(0);
    setRetryCount(0);
    setHasFailed(!sources.length);
  }, [sources]);

  const source = getRetryUrl(sources[sourceIndex], retryCount);

  const handleError = () => {
    if (retryCount < 3 && sources[sourceIndex] && !/^data:/i.test(sources[sourceIndex])) {
      window.setTimeout(() => {
        setRetryCount((current) => current + 1);
      }, 700 + retryCount * 500);
      return;
    }

    if (sourceIndex < sources.length - 1) {
      setSourceIndex((current) => current + 1);
      setRetryCount(0);
      return;
    }

    setHasFailed(true);
  };

  return (
    <div className="relative h-full w-full rounded-lg bg-white border border-slate-200 shadow-sm overflow-hidden">
      {source && !hasFailed && (
        <img
          src={source}
          alt=""
          onError={handleError}
          className="w-full h-full object-contain bg-white"
        />
      )}

      {hasFailed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white px-4 text-center">
          <AlertTriangle size={22} className="text-amber-500" />
          <p className="text-xs font-bold text-slate-600">Preview retry failed</p>
          <p className="text-[10px] text-slate-400">Download button still works for saved output.</p>
        </div>
      )}
    </div>
  );
}

export default function ResultGallery({ results = [], failedImages = [], zipUrl, onReset }) {
  const hasResults = results.length > 0;
  const hasFailures = failedImages.length > 0;
  const headerTitle = hasResults && hasFailures
    ? 'Processed with Warnings'
    : hasResults
      ? 'Compressed Successfully'
      : 'Processing Failed';

  const getAssetUrl = (url) => {
    if (!url) return '';
    if (/^data:/i.test(url)) return url;
    return getApiUrl(url);
  };

  const handleDownload = (url, name) => {
    // Force download by creating a temporary link
    const link = document.createElement('a');
    link.href = getAssetUrl(url);
    link.download = name || 'processed_photo.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-end gap-2">
        <a
          href="https://shahbaznetcafe.com"
          target="_blank"
          rel="noreferrer"
          className="bg-punjab-blue hover:bg-punjab-green text-white font-bold py-3 px-5 rounded-xl shadow-lg hover:shadow-xl transition-all-custom flex items-center justify-center gap-2 text-sm"
        >
          <Sparkles size={18} />
          <span>Explore More Free Tools</span>
          <ExternalLink size={16} />
        </a>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-50 rounded-full text-punjab-green shrink-0">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">{headerTitle}</h3>
            <p className="urdu-text text-[11px] leading-3 text-slate-400 mt-1">
              {hasFailures ? 'کچھ تصاویر تیار نہیں ہو سکیں' : 'تمام تصاویر کامیابی کے ساتھ تیار ہو گئی ہیں'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {hasResults
                ? <>Processed images have been adjusted to 600x800 px and fit within the <span className="font-semibold text-punjab-green">11KB - 24KB</span> size range.</>
                : 'No files were processed. Please check the details below and upload again.'}
            </p>
          </div>
        </div>
        
        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <a
            href="https://shahbaznetcafe.com"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto bg-white hover:bg-green-50 text-punjab-green border border-punjab-green/20 font-bold py-3.5 px-5 rounded-xl shadow-sm hover:shadow-md transition-all-custom flex items-center justify-center gap-2 text-sm"
          >
            <ExternalLink size={18} />
            <span>More SBZ Tools</span>
          </a>
          {zipUrl && (
            <button
              onClick={() => handleDownload(zipUrl, 'sed_punjab_photos.zip')}
              className="w-full sm:w-auto bg-punjab-green hover:bg-punjab-green-dark text-white font-bold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all-custom flex items-center justify-center gap-2 text-sm"
            >
              <Download size={18} />
              <div className="flex flex-col items-start leading-none text-left">
                <span className="text-sm font-semibold tracking-wide">Download All ZIP</span>
                <span className="urdu-text text-[9px] leading-none text-white/80 font-normal">زپ فائل ڈاؤن لوڈ کریں</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {hasFailures && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-white p-2 text-amber-600">
              <AlertTriangle size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-amber-900">
                {failedImages.length} image{failedImages.length === 1 ? '' : 's'} need retry
              </h4>
              <p className="mt-1 text-xs text-amber-800/80">
                Successful images are still ready. Retry only the files listed below.
              </p>
              <div className="mt-3 space-y-2">
                {failedImages.map((item, index) => (
                  <div key={`${item.original_name}-${index}`} className="rounded-xl bg-white/75 border border-amber-100 px-3 py-2">
                    <p className="truncate text-xs font-bold text-slate-800" title={item.original_name}>
                      {item.original_name || `Image ${index + 1}`}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-amber-700">
                      {item.reason || 'Processing failed. Please retry this image.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid of processed images */}
      {hasResults ? (
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
                <ImagePreview image={img} getAssetUrl={getAssetUrl} />
                
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
                  onClick={() => handleDownload(img.data_url || img.url, img.original_name)}
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
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
          <AlertTriangle size={28} className="mx-auto text-amber-500" />
          <p className="mt-3 text-sm font-bold text-slate-700">No preview files are available.</p>
          <p className="mt-1 text-xs text-slate-400">Please upload the failed images again.</p>
        </div>
      )}

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
