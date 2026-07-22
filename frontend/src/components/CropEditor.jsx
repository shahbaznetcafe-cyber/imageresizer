import React, { useState } from 'react';
import Cropper from 'react-easy-crop';
import { ZoomIn, ArrowRight, ArrowLeft, Crop, Loader2 } from 'lucide-react';
import { getCroppedImg } from '../utils/cropImage';
import { DEFAULT_CROP_PRESET } from '../utils/cropPresets';

function FilePreviewName({ name }) {
  return (
    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 text-3xl font-black uppercase">
      {(name?.split('.').pop() || 'img').slice(0, 4)}
    </div>
  );
}

export default function CropEditor({ files, onCroppingDone, cropPreset = DEFAULT_CROP_PRESET }) {
  const aspect = cropPreset.width / cropPreset.height;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [croppedFiles, setCroppedFiles] = useState([]);

  const currentFileItem = files[currentIndex];
  const canCropCurrent = currentFileItem?.canCropInBrowser !== false;

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleNextOrFinish = async () => {
    if (canCropCurrent && !croppedAreaPixels) return;

    setProcessing(true);
    try {
      const croppedFile = canCropCurrent
        ? await getCroppedImg(
          currentFileItem.previewUrl,
          croppedAreaPixels,
          currentFileItem.file.name
        )
        : currentFileItem.file;

      const newCroppedFiles = [...croppedFiles];
      // Store cropped file at correct index (overwriting if re-cropped)
      newCroppedFiles[currentIndex] = {
        file: croppedFile,
        previewUrl: URL.createObjectURL(croppedFile),
        originalName: currentFileItem.file.name
      };
      setCroppedFiles(newCroppedFiles);

      // 2. Navigate to next image or finish
      if (currentIndex < files.length - 1) {
        setCurrentIndex(currentIndex + 1);
        // Reset cropper controls for next image
        setZoom(1);
        setCrop({ x: 0, y: 0 });
        setCroppedAreaPixels(null);
      } else {
        // All files cropped! Pass them up
        onCroppingDone(newCroppedFiles);
      }
    } catch (err) {
      console.error('Error cropping image:', err);
      alert('Error cropping image: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setCroppedAreaPixels(null);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden transition-all duration-300">
      {/* Title Header */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Crop size={18} className="text-punjab-blue" />
            Crop Student/Staff Photo
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {cropPreset.labelEn} · {cropPreset.width}x{cropPreset.height}{cropPreset.dpi ? ` · ${cropPreset.dpi} DPI` : ''}
          </p>
        </div>
        
        <div className="text-right">
          <span className="bg-blue-50 text-punjab-blue font-bold px-3 py-1 rounded-full text-xs">
            Photo {currentIndex + 1} of {files.length}
          </span>
          <p className="urdu-text text-[11px] leading-3 text-slate-400 mt-1">تصویر {currentIndex + 1} مندرجہ {files.length}</p>
        </div>
      </div>

      {/* Cropper Container */}
      <div className="relative w-full h-[400px] bg-slate-900 flex items-center justify-center">
        {canCropCurrent ? (
          <Cropper
            image={currentFileItem.previewUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            showGrid={true}
            restrictPosition={true}
          />
        ) : (
          <div className="mx-6 max-w-md rounded-2xl border border-white/10 bg-white/10 p-6 text-center text-white shadow-xl">
            <FilePreviewName name={currentFileItem.file.name} />
            <p className="mt-3 text-sm font-semibold leading-6">
              This format cannot be preview-cropped, but it will still be processed in your browser and downloaded as JPG.
            </p>
            <p className="mt-2 text-xs text-white/70">
              Original file will be sent safely; final output remains {cropPreset.width} x {cropPreset.height} JPG.
            </p>
          </div>
        )}
        
        {processing && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20">
            <Loader2 className="animate-spin text-punjab-green-light mb-2" size={32} />
            <p className="text-sm font-semibold tracking-wide">Applying Crop...</p>
            <p className="urdu-text text-xs leading-3 text-white/80">فصل لاگو ہو رہا ہے...</p>
          </div>
        )}
      </div>

      {/* Controls Footer */}
      <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-6">
        {/* Zoom Slider */}
        {canCropCurrent && (
        <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
          <ZoomIn size={18} className="text-slate-400 shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-punjab-blue"
          />
          <span className="text-xs font-mono font-bold text-slate-500 shrink-0">{zoom.toFixed(1)}x</span>
        </div>
        )}

        {/* Info Box */}
        <div className="p-3 bg-blue-50/50 border border-blue-100/50 rounded-xl flex items-start gap-2.5 text-xs text-punjab-blue-dark">
          <div className="space-y-1">
            <p className="font-semibold">💡 Tip: Center the student's face inside the grid. The ears and shoulders should align symmetrically.</p>
            <p className="urdu-text text-right text-[11px] leading-4 text-blue-800">
              مدد: طالب علم کا چہرہ گرڈ کے اندر رکھیں۔ دونوں کان اور کندھے متوازی ہونے چاہئیں۔
            </p>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0 || processing}
            className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold py-3 px-5 rounded-xl border border-slate-200 shadow-sm transition-all-custom disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <button
            onClick={handleNextOrFinish}
            disabled={processing}
            className="flex-1 bg-gradient-to-r from-punjab-blue to-punjab-green hover:from-punjab-blue-dark hover:to-punjab-green-dark text-white font-bold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all-custom flex items-center justify-center gap-2 disabled:opacity-75"
          >
            {currentIndex < files.length - 1 ? (
              <div className="flex flex-col items-center">
                <span className="text-sm font-semibold tracking-wide flex items-center gap-1.5">
                  {canCropCurrent ? 'Crop Next Image' : 'Use This Image'} <ArrowRight size={16} />
                </span>
                <span className="urdu-text text-[10px] leading-3 text-white/80 font-normal">اگلی تصویر کراپ کریں</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <span className="text-sm font-semibold tracking-wide flex items-center gap-1.5">
                  {canCropCurrent ? 'Confirm & Process All' : 'Process as JPG'} <ArrowRight size={16} />
                </span>
                <span className="urdu-text text-[10px] leading-3 text-white/80 font-normal">تصدیق کریں اور پروسیس کریں</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
