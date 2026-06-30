import React, { useEffect, useState } from 'react';
import { School, LogOut, Check } from 'lucide-react';
import LoginRecordForm from './components/LoginRecordForm';
import UploadArea from './components/UploadArea';
import CropEditor from './components/CropEditor';
import ProcessingStatus from './components/ProcessingStatus';
import ResultGallery from './components/ResultGallery';
import FooterBranding from './components/FooterBranding';
import { getApiErrorMessage, getNetworkErrorMessage } from './utils/apiErrors';
import { getApiUrl } from './utils/api';

const SESSION_CACHE_KEY = 'pectaa-session-cache';
const SESSION_CACHE_MS = 2 * 60 * 60 * 1000;

function loadCachedSession() {
  try {
    const cached = JSON.parse(window.localStorage.getItem(SESSION_CACHE_KEY) || 'null');
    if (!cached?.session || !cached?.expiresAt || cached.expiresAt <= Date.now()) {
      window.localStorage.removeItem(SESSION_CACHE_KEY);
      return null;
    }
    return cached.session;
  } catch {
    window.localStorage.removeItem(SESSION_CACHE_KEY);
    return null;
  }
}

function storeCachedSession(sessionData) {
  window.localStorage.setItem(
    SESSION_CACHE_KEY,
    JSON.stringify({
      session: sessionData,
      expiresAt: Date.now() + SESSION_CACHE_MS,
    })
  );
}

function clearCachedSession() {
  window.localStorage.removeItem(SESSION_CACHE_KEY);
}

function warmBackendProcessor() {
  fetch(getApiUrl('/api/warmup'), {
    method: 'POST',
    keepalive: true,
  }).catch(() => {
    // Warmup is only a speed boost; the main workflow can continue without it.
  });
}

export default function App() {
  const [step, setStep] = useState('login'); // 'login', 'upload', 'crop', 'processing', 'result'
  const [session, setSession] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [croppedFiles, setCroppedFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [zipUrl, setZipUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cachedSession = loadCachedSession();
    if (cachedSession) {
      setSession(cachedSession);
      setStep('upload');
      warmBackendProcessor();
    }
  }, []);

  const handleLoginSuccess = (sessionData) => {
    setSession(sessionData);
    storeCachedSession(sessionData);
    warmBackendProcessor();
    setStep('upload');
  };

  const handleFilesSelected = (files) => {
    setUploadedFiles(files);
    setStep('crop');
  };

  const handleCroppingDone = async (croppedList) => {
    setCroppedFiles(croppedList);
    setStep('processing');
    setError(null);

    // Prepare files to send to FastAPI
    const formData = new FormData();
    formData.append('session_id', session.id);
    croppedList.forEach((item) => {
      // Append each cropped file
      formData.append('files', item.file, item.originalName);
    });

    try {
      const response = await fetch(getApiUrl('/api/process-images'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, 'Processing failed. Please check backend connection.'));
      }

      const data = await response.json();
      setResults(data.images);
      setZipUrl(data.zip_url);
      
      // Update local session processed count
      setSession(prev => {
        const updatedSession = {
          ...prev,
          processed_count: data.total_session_count
        };
        storeCachedSession(updatedSession);
        return updatedSession;
      });
      
      setStep('result');
    } catch (err) {
      console.error(err);
      const message = getNetworkErrorMessage(err, 'Image processing failed. Please check backend connection.');
      setError({
        en: message,
        ur: message
      });
      if (/session expired/i.test(message)) {
        clearCachedSession();
        setSession(null);
        setStep('login');
        return;
      }
      setStep('upload'); // bounce back to upload so they can retry
    }
  };

  const handleReset = () => {
    // Revoke any Object URLs to free memory
    croppedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
    uploadedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
    
    setUploadedFiles([]);
    setCroppedFiles([]);
    setResults([]);
    setZipUrl(null);
    setError(null);
    setStep('upload');
  };

  const handleLogout = () => {
    handleReset();
    clearCachedSession();
    setSession(null);
    setStep('login');
  };

  // Progress Stepper steps
  const stepsList = [
    { key: 'upload', label: 'Upload', ur: 'اپ لوڈ' },
    { key: 'crop', label: 'Crop', ur: 'کراپ' },
    { key: 'processing', label: 'Processing', ur: 'پروسیسنگ' },
    { key: 'result', label: 'Download', ur: 'ڈاؤن لوڈ' },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 text-slate-800">
      
      {/* Top Header / Branding */}
      <header className="bg-white border-b border-slate-200 shadow-sm py-4 px-6 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-punjab-blue to-punjab-green p-2.5 rounded-xl text-white shadow-md">
              <School size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800">PECTAA Image Resizer</h1>
              <p className="text-[10px] uppercase font-bold text-punjab-green tracking-wider leading-none mt-0.5">
                Official Government Size (600x800 px)
              </p>
            </div>
          </div>

          {session && (
            <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/50 rounded-xl p-2 pl-3 pr-2.5 shadow-sm text-xs transition-all duration-300">
              <div className="text-right">
                <p className="font-semibold text-slate-700 font-mono">EMIS: {session.emis_code}</p>
                <p className="text-[10px] text-slate-400">Processed: {session.processed_count} photos</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                title="Change EMIS Code"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 flex flex-col justify-center items-center">
        
        {/* Step Stepper Header (Only shown if logged in) */}
        {step !== 'login' && (
          <div className="w-full max-w-2xl mb-8">
            <div className="flex items-center justify-between relative px-2">
              {/* Stepper connecting line */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 z-0"></div>
              
              {stepsList.map((s, idx) => {
                const isCompleted = stepsList.findIndex(item => item.key === step) > idx;
                const isActive = step === s.key;
                
                return (
                  <div key={s.key} className="flex flex-col items-center z-10 relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all duration-500 border-2 ${
                      isCompleted ? 'bg-punjab-green border-punjab-green text-white' :
                      isActive ? 'bg-punjab-blue border-punjab-blue text-white ring-4 ring-blue-100' :
                      'bg-white border-slate-300 text-slate-400'
                    }`}>
                      {isCompleted ? <Check size={14} /> : idx + 1}
                    </div>
                    <div className="text-center mt-1 bg-slate-50 px-2.5 rounded-md">
                      <p className={`text-[10px] font-bold ${isActive ? 'text-punjab-blue font-semibold' : 'text-slate-400'}`}>
                        {s.label}
                      </p>
                      <p className={`urdu-text text-[9px] leading-none -mt-1 font-normal ${isActive ? 'text-punjab-blue font-semibold' : 'text-slate-400'}`}>
                        {s.ur}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {error && step !== 'processing' && (
          <div className="w-full max-w-md p-4 mb-6 bg-red-50 border-l-4 border-red-500 rounded-xl text-sm text-red-700 shadow-sm space-y-1">
            <p className="font-semibold">{error.en}</p>
            <p className="urdu-text text-right text-xs leading-5">{error.ur}</p>
          </div>
        )}

        {/* Step components */}
        <div className="w-full flex justify-center">
          {step === 'login' && <LoginRecordForm onLoginSuccess={handleLoginSuccess} />}
          {step === 'upload' && <UploadArea onFilesSelected={handleFilesSelected} />}
          {step === 'crop' && <CropEditor files={uploadedFiles} onCroppingDone={handleCroppingDone} />}
          {step === 'processing' && <ProcessingStatus files={croppedFiles} />}
          {step === 'result' && (
            <ResultGallery results={results} zipUrl={zipUrl} onReset={handleReset} />
          )}
        </div>
      </main>

      {/* Footer credits */}
      <FooterBranding />
    </div>
  );
}
