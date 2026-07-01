import React, { useState, useRef } from 'react';
import { UploadCloud, FileImage, Trash2, AlertCircle, ArrowRight, Pin } from 'lucide-react';

export default function UploadArea({ onFilesSelected }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const validateFiles = (files) => {
    setError(null);
    const newFiles = [...selectedFiles];
    const totalFilesAfterAddition = newFiles.length + files.length;

    if (totalFilesAfterAddition > 10) {
      setError({
        en: 'You can upload a maximum of 10 images.',
        ur: 'آپ زیادہ سے زیادہ 10 تصاویر اپ لوڈ کر سکتے ہیں۔'
      });
      return;
    }

    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB

    for (let file of files) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      const isValidExt = validExtensions.includes(ext);
      const isValidMime = validMimeTypes.includes(file.type);

      if (!isValidExt && !isValidMime) {
        setError({
          en: `Unsupported format for '${file.name}'. Only JPG, JPEG, PNG, and WEBP are allowed.`,
          ur: `فائل '${file.name}' غیر معاون یافتہ فارمیٹ کی ہے۔ صرف JPG, JPEG, PNG اور WEBP کی اجازت ہے۔`
        });
        return;
      }

      if (file.size > maxSizeBytes) {
        setError({
          en: `File '${file.name}' exceeds the 10MB limit.`,
          ur: `فائل '${file.name}' کا سائز 10MB سے زیادہ ہے۔`
        });
        return;
      }

      // Check if file is already added
      const exists = newFiles.some(f => f.file.name === file.name && f.file.size === file.size);
      if (!exists) {
        newFiles.push({
          file: file,
          previewUrl: URL.createObjectURL(file),
          sizeKb: (file.size / 1024).toFixed(1)
        });
      }
    }

    setSelectedFiles(newFiles);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index) => {
    const fileToRemove = selectedFiles[index];
    URL.revokeObjectURL(fileToRemove.previewUrl);
    
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    setError(null);
  };

  const handleProceed = () => {
    if (selectedFiles.length === 0) {
      setError({
        en: 'Please select at least 1 image to proceed.',
        ur: 'براہ کرم آگے بڑھنے کے لیے کم از کم 1 تصویر منتخب کریں۔'
      });
      return;
    }
    onFilesSelected(selectedFiles);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-sm text-red-700 flex gap-3 items-start shadow-sm">
          <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">{error.en}</p>
            <p className="urdu-text text-right text-xs leading-5">{error.ur}</p>
          </div>
        </div>
      )}

      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
        className="w-full border-2 border-dashed border-slate-300 hover:border-punjab-blue bg-white hover:bg-slate-50/50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all-custom shadow-sm hover:shadow-md group text-center"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept=".jpg,.jpeg,.png,.webp"
          className="hidden"
        />

        <div className="p-4 bg-slate-50 rounded-2xl group-hover:scale-110 transition-transform duration-300 mb-4 group-hover:bg-blue-50">
          <UploadCloud size={40} className="text-slate-400 group-hover:text-punjab-blue transition-colors" />
        </div>

        <h3 className="text-lg font-bold text-slate-700">Drag & Drop Images</h3>
        <p className="text-xs text-slate-400 mt-1">Supports JPG, JPEG, PNG, WEBP (Max 10MB per image)</p>
        
        <p className="urdu-text text-slate-500 mt-3 text-sm">
          تصاویر کو یہاں کھینچ کر لائیں یا کلک کر کے منتخب کریں <br />
          <span className="text-xs text-slate-400 font-normal">زیادہ سے زیادہ 10 تصاویر (ہر تصویر حد 10MB)</span>
        </p>
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-9 w-9 rounded-xl bg-white text-amber-600 flex items-center justify-center shrink-0 shadow-sm">
            <Pin size={17} />
          </div>
          <div dir="rtl" className="urdu-text text-right text-xs leading-6 text-slate-700">
            <p className="font-bold text-slate-800">📌 نوٹ</p>
            <p>
              پہلی بار براہِ کرم صرف ایک تصویر اپ لوڈ کریں۔ چونکہ پہلی مرتبہ پروسیسنگ ماڈل لوڈ ہوتا ہے، اس لیے اس عمل میں تقریباً 60 سے 90 سیکنڈ لگ سکتے ہیں۔ ماڈل لوڈ ہونے کے بعد آپ باآسانی ایک ساتھ متعدد (Bulk) تصاویر اپ لوڈ کر سکتے ہیں، اور پروسیسنگ کافی تیز ہو جائے گی۔
            </p>
          </div>
        </div>
      </div>

      {/* Uploaded Files List */}
      {selectedFiles.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h4 className="font-bold text-slate-700 flex items-center gap-2">
              <FileImage size={18} className="text-punjab-blue" />
              Selected Images ({selectedFiles.length}/10)
            </h4>
            <span className="text-xs text-slate-400 font-mono font-semibold">
              Ready for Crop Step
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectedFiles.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl relative group overflow-hidden"
              >
                <img
                  src={item.previewUrl}
                  alt="preview"
                  className="w-12 h-16 object-cover rounded-lg bg-slate-200 border border-slate-200"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{item.file.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.sizeKb} KB</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                  title="Remove image"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              onClick={handleProceed}
              className="w-full bg-gradient-to-r from-punjab-blue to-punjab-green text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all-custom flex items-center justify-center gap-2 group"
            >
              <div className="flex flex-col items-center">
                <span className="text-sm font-semibold tracking-wide flex items-center gap-1.5">
                  Proceed to Crop & Preview <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </span>
                <span className="urdu-text text-[10px] leading-3 text-white/80 font-normal">کراپ اور پریویو پر جائیں</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
