import React, { useEffect, useState } from 'react';
import { CreditCard, School, LogOut, Check, X } from 'lucide-react';
import LoginRecordForm from './components/LoginRecordForm';
import UploadArea from './components/UploadArea';
import CropEditor from './components/CropEditor';
import ProcessingStatus from './components/ProcessingStatus';
import ResultGallery from './components/ResultGallery';
import FooterBranding from './components/FooterBranding';
import AdminRecords from './components/AdminRecords';
import SBZTrafficStrip from './components/SBZTrafficStrip';
import FeedbackDialog from './components/FeedbackDialog';
import LimitRequestForm from './components/LimitRequestForm';
import { getApiErrorMessage, getNetworkErrorMessage } from './utils/apiErrors';
import { getApiUrl } from './utils/api';

const SESSION_CACHE_KEY = 'pectaa-session-cache-v2';
const SESSION_CACHE_MS = 12 * 60 * 60 * 1000;
const LOCAL_PERSONAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const PERSONAL_MODE = import.meta.env.VITE_PERSONAL_MODE === 'true'
  || LOCAL_PERSONAL_HOSTS.has(window.location.hostname);
const PERSONAL_MACHINE_ID_KEY = 'pectaa-personal-machine-id';

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

function getPersonalMachineId() {
  const existing = window.localStorage.getItem(PERSONAL_MACHINE_ID_KEY);
  if (existing) return existing;

  const id = window.crypto?.randomUUID?.()
    || `personal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(PERSONAL_MACHINE_ID_KEY, id);
  return id;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options, config = {}) {
  const {
    retries = 1,
    timeoutMs = 180000,
    retryStatuses = [502, 503, 504],
  } = config;

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      window.clearTimeout(timer);

      if (!retryStatuses.includes(response.status) || attempt === retries) {
        return response;
      }

      await wait(1500 + attempt * 1500);
    } catch (error) {
      window.clearTimeout(timer);
      lastError = error;

      if (attempt === retries) {
        throw error;
      }

      await wait(1500 + attempt * 1500);
    }
  }

  throw lastError || new Error('Request failed. Please try again.');
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
  const [failedImages, setFailedImages] = useState([]);
  const [zipUrl, setZipUrl] = useState(null);
  const [error, setError] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [quotaRestriction, setQuotaRestriction] = useState(null);
  const [showLimitRequest, setShowLimitRequest] = useState(false);

  useEffect(() => {
    // Start the model while the operator enters login details instead of delaying the first image.
    warmBackendProcessor();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const cachedSession = loadCachedSession();
    if (cachedSession) {
      setSession(cachedSession);
      setStep('upload');
      warmBackendProcessor();
      return () => {
        isMounted = false;
      };
    }

    if (!PERSONAL_MODE) {
      return () => {
        isMounted = false;
      };
    }

    const createPersonalSession = async () => {
      setStep('login');
      setError(null);

      try {
        const formData = new FormData();
        formData.append('emis_code', '00000000');
        formData.append('school_name', 'Personal Use');
        formData.append('phone_number', '0000000000');
        formData.append('machine_id', getPersonalMachineId());
        formData.append('machine_type', 'Personal Local Unlimited');

        const response = await fetch(getApiUrl('/api/session'), {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(await getApiErrorMessage(response, 'Personal session could not start.'));
        }

        const sessionData = await response.json();
        if (!isMounted) return;
        setSession(sessionData);
        setQuotaRestriction(null);
        storeCachedSession(sessionData);
        warmBackendProcessor();
        setStep('upload');
      } catch (err) {
        if (!isMounted) return;
        const message = getNetworkErrorMessage(err, 'Personal mode backend is not ready. Please refresh in a few seconds.');
        setError({ en: message, ur: message });
        setStep('login');
      }
    };

    createPersonalSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLoginSuccess = (sessionData) => {
    setSession(sessionData);
    setQuotaRestriction(null);
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
      const response = await fetchWithRetry(
        getApiUrl('/api/process-images'),
        {
          method: 'POST',
          body: formData,
        },
        {
          retries: 1,
          timeoutMs: 180000,
        }
      );

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const payload = await response.json();
          const detail = payload?.detail;
          if (detail?.code === 'quota_limit' || detail?.code === 'blocked') {
            setQuotaRestriction(detail);
            setSession(prev => {
              const updatedSession = {
                ...prev,
                quota: detail.quota,
              };
              storeCachedSession(updatedSession);
              return updatedSession;
            });
            setError(null);
            setStep('upload');
            return;
          }

          const detailMessage = typeof detail === 'string' ? detail : detail?.en;
          throw new Error(detailMessage || 'Processing failed. Please check backend connection.');
        }
        throw new Error(await getApiErrorMessage(response, 'Processing failed. Please check backend connection.'));
      }

      const data = await response.json();
      setResults(data.images || []);
      setFailedImages(data.failed_images || []);
      setZipUrl(data.zip_data_url || data.zip_url);
      
      // Update local session processed count
      setSession(prev => {
        const updatedSession = {
          ...prev,
          processed_count: data.total_session_count,
          quota: data.quota || prev.quota,
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
    setFailedImages([]);
    setZipUrl(null);
    setError(null);
    setQuotaRestriction(null);
    setStep('upload');
  };

  const handleLogout = () => {
    handleReset();
    clearCachedSession();
    setSession(null);
    setQuotaRestriction(null);
    setShowLimitRequest(false);
    setStep('login');
  };

  const activeQuota = quotaRestriction?.quota || session?.quota;
  const quotaReached = Boolean(
    activeQuota
    && (activeQuota.blocked || Number(activeQuota.remaining ?? 1) <= 0)
  );

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
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-[10px] uppercase font-bold text-punjab-green tracking-wider leading-none">
                <img src="/sbz-tech-icon.png" alt="" className="h-3.5 w-auto object-contain" />
                Powered by SBZ Tech
              </p>
            </div>
          </div>

          {session && (
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200/50 bg-slate-50 p-2 pl-3 pr-2.5 text-xs shadow-sm transition-all duration-300 sm:flex-row sm:items-center">
              <div className="text-right">
                <p className="font-semibold text-slate-700 font-mono">EMIS: {session.emis_code}</p>
                <p className="text-[10px] text-slate-400">
                  {PERSONAL_MODE || session.quota?.unlimited
                    ? 'Personal unlimited mode'
                    : session.quota
                    ? `Quota used: ${session.quota.photos_used || 0}/${session.quota.photo_limit || 35} photos`
                    : `Processed: ${session.processed_count} photos`}
                </p>
              </div>
              {!PERSONAL_MODE && !session.quota?.unlimited && !quotaReached && (
                <button
                  type="button"
                  onClick={() => setShowLimitRequest(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] font-black text-amber-700 transition-colors hover:bg-amber-100"
                >
                  <CreditCard size={14} />
                  Request More
                </button>
              )}
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
        {!showAdmin && step !== 'login' && (
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
        {!showAdmin && error && step !== 'processing' && (
          <div className="w-full max-w-md p-4 mb-6 bg-red-50 border-l-4 border-red-500 rounded-xl text-sm text-red-700 shadow-sm space-y-1">
            <p className="font-semibold">{error.en}</p>
            <p className="urdu-text text-right text-xs leading-5">{error.ur}</p>
          </div>
        )}

        {/* Step components */}
        <div className="w-full flex justify-center">
          {showAdmin ? (
            <AdminRecords
              onBack={() => {
                setShowAdmin(false);
              }}
            />
          ) : (
            <>
              {step === 'login' && (
                PERSONAL_MODE ? (
                  <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-xl">
                    <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-punjab-blue" />
                    <p className="text-sm font-bold text-slate-700">Starting personal unlimited mode...</p>
                    <p className="mt-1 text-xs text-slate-400">Backend ready hotay hi upload screen open ho jayegi.</p>
                  </div>
                ) : (
                  <LoginRecordForm
                    onLoginSuccess={handleLoginSuccess}
                    onAdminOpen={() => setShowAdmin(true)}
                  />
                )
              )}
              {step === 'upload' && (
                quotaReached ? (
                  <LimitRequestForm session={session} quota={activeQuota} isQuotaReached />
                ) : (
                  <UploadArea onFilesSelected={handleFilesSelected} />
                )
              )}
              {step === 'crop' && <CropEditor files={uploadedFiles} onCroppingDone={handleCroppingDone} />}
              {step === 'processing' && <ProcessingStatus files={croppedFiles} />}
              {step === 'result' && (
                <ResultGallery
                  results={results}
                  failedImages={failedImages}
                  zipUrl={zipUrl}
                  onReset={handleReset}
                />
              )}
            </>
          )}
        </div>

        {session && !showAdmin && step !== 'login' && step !== 'processing' && (
          <FeedbackDialog session={session} />
        )}

        {showLimitRequest && session && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 px-4 py-6 backdrop-blur-sm sm:py-10">
            <div className="relative w-full max-w-2xl">
              <button
                type="button"
                onClick={() => setShowLimitRequest(false)}
                className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
                aria-label="Close request more photos form"
              >
                <X size={16} />
              </button>
              <LimitRequestForm session={session} quota={activeQuota} onSubmitted={() => {}} />
            </div>
          </div>
        )}
      </main>

      {/* Footer credits */}
      <SBZTrafficStrip />
      <FooterBranding />
    </div>
  );
}
