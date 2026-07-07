import React, { useEffect, useState } from 'react';
import { School, Phone, ArrowRight, Loader2, History, LockKeyhole, Building2, MonitorSmartphone, Bug, CreditCard } from 'lucide-react';
import BuyMoreDialog from './BuyMoreDialog';
import ProblemReportDialog from './ProblemReportDialog';
import { getApiErrorMessage, getNetworkErrorMessage } from '../utils/apiErrors';
import { getApiUrl } from '../utils/api';

const REMEMBER_LOGIN_KEY = 'pectaa-remember-login';
const MACHINE_ID_KEY = 'pectaa-machine-id';
const REMEMBER_MS = 15 * 24 * 60 * 60 * 1000;

function getMachineId() {
  const existing = window.localStorage.getItem(MACHINE_ID_KEY);
  if (existing) return existing;

  const id = window.crypto?.randomUUID?.()
    || `sbz-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(MACHINE_ID_KEY, id);
  return id;
}

function getMachineType() {
  const ua = window.navigator.userAgent || '';
  const platform = window.navigator.platform || '';
  const touch = window.navigator.maxTouchPoints > 1;
  const width = window.screen?.width || window.innerWidth;

  const device = /ipad|tablet/i.test(ua)
    ? 'Tablet'
    : /mobi|android|iphone/i.test(ua) || width < 768
      ? 'Mobile'
      : 'Desktop/Laptop';
  const os = /windows/i.test(ua) || /win/i.test(platform)
    ? 'Windows'
    : /android/i.test(ua)
      ? 'Android'
      : /iphone|ipad|ios/i.test(ua)
        ? 'iOS'
        : /mac/i.test(platform)
          ? 'macOS'
          : /linux/i.test(platform)
            ? 'Linux'
            : 'Unknown OS';

  return `${device} - ${os}${touch ? ' - Touch' : ''}`;
}

export default function LoginRecordForm({ onLoginSuccess, onAdminOpen }) {
  const [emisCode, setEmisCode] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activity, setActivity] = useState(null);
  const [showBuyMore, setShowBuyMore] = useState(false);
  const [showProblemForm, setShowProblemForm] = useState(false);

  const formatDate = (value) => {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value));
    } catch {
      return '';
    }
  };

  useEffect(() => {
    try {
      getMachineId();
      const remembered = JSON.parse(window.localStorage.getItem(REMEMBER_LOGIN_KEY) || 'null');
      if (!remembered || remembered.expiresAt <= Date.now()) {
        window.localStorage.removeItem(REMEMBER_LOGIN_KEY);
        return;
      }

      setEmisCode(remembered.emisCode || '');
      setSchoolName(remembered.schoolName || '');
      setPhoneNumber(remembered.phoneNumber || '');
      setRememberMe(true);
    } catch {
      window.localStorage.removeItem(REMEMBER_LOGIN_KEY);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadActivity = async () => {
      try {
        const response = await fetch(getApiUrl('/api/activity'));
        if (!response.ok) return;
        const data = await response.json();
        if (isMounted) {
          setActivity(data);
        }
      } catch {
        // Activity is helpful, but login should still render if the backend is offline.
      }
    };

    loadActivity();
    const timer = window.setInterval(loadActivity, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Basic frontend validations
    const emisCleaned = emisCode.replace(/\D/g, '');
    if (emisCleaned.length !== 8) {
      setError({
        en: 'EMIS Code must be exactly 8 digits.',
        ur: 'ایمس کوڈ صرف 8 ہندسوں پر مشتمل ہونا چاہئے۔'
      });
      return;
    }

    const schoolNameCleaned = schoolName.trim().replace(/\s+/g, ' ');
    if (schoolNameCleaned.length < 2) {
      setError({
        en: 'School Name is required.',
        ur: 'School Name is required.'
      });
      return;
    }

    const phoneCleaned = phoneNumber.replace(/\D/g, '');
    if (phoneCleaned.length < 10 || phoneCleaned.length > 15) {
      setError({
        en: 'Phone Number must be between 10 and 15 digits.',
        ur: 'فون نمبر 10 سے 15 ہندسوں کے درمیان ہونا چاہئے۔'
      });
      return;
    }

    setLoading(true);

    try {
      // Create Session in Backend
      const formData = new FormData();
      formData.append('emis_code', emisCleaned);
      formData.append('school_name', schoolNameCleaned);
      formData.append('phone_number', phoneNumber);
      formData.append('machine_id', getMachineId());
      formData.append('machine_type', getMachineType());

      // Determine backend API URL (runs on the same host or relative in production, fallback to local)
      const response = await fetch(getApiUrl('/api/session'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, 'Failed to create session. Please check backend connection.'));
      }

      const session = await response.json();
      if (rememberMe) {
        window.localStorage.setItem(
          REMEMBER_LOGIN_KEY,
          JSON.stringify({
            emisCode: emisCleaned,
            schoolName: schoolNameCleaned,
            phoneNumber,
            expiresAt: Date.now() + REMEMBER_MS,
          })
        );
      } else {
        window.localStorage.removeItem(REMEMBER_LOGIN_KEY);
      }
      onLoginSuccess(session);
    } catch (err) {
      console.error(err);
      const message = getNetworkErrorMessage(err, 'Server error. Please check your connection.');
      setError({
        en: message,
        ur: message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-punjab-blue to-punjab-green p-6 text-white text-center relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full transform translate-x-8 -translate-y-8"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full transform -translate-x-4 translate-y-4"></div>
        <h2 className="text-2xl font-bold tracking-tight">PECTAA Image Resizer</h2>
        <p className="text-xs text-white/80 mt-1 uppercase tracking-wider font-semibold">
          For 5th & 8th Grades Registration
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-md text-sm text-red-700 space-y-1">
            <p className="font-semibold">{error.en}</p>
            <p className="urdu-text text-right text-xs leading-5">{error.ur}</p>
          </div>
        )}

        {/* School EMIS Code */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1">
              <School size={14} className="text-punjab-blue" />
              School EMIS Code
            </span>
            <span className="urdu-text text-[11px] leading-3 text-slate-400">سکول ایمس کوڈ (صرف 8 ہندسے)</span>
          </div>
          <div className="relative mt-1">
            <input
              type="text"
              required
              maxLength={8}
              placeholder="e.g. 33150056"
              value={emisCode}
              onChange={(e) => setEmisCode(e.target.value.replace(/\D/g, ''))}
              className="w-full pl-3 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-punjab-blue-light focus:border-transparent outline-none transition-all-custom text-slate-800 font-mono tracking-widest text-lg text-center"
            />
          </div>
        </div>

        {/* School Name */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1">
              <Building2 size={14} className="text-punjab-green" />
              School Name
            </span>
            <span dir="rtl" className="urdu-text text-[11px] leading-3 text-slate-400 text-right">School name</span>
          </div>
          <div className="relative mt-1">
            <input
              type="text"
              required
              maxLength={120}
              placeholder="e.g. Govt Elementary School"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full pl-3 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-punjab-green-light focus:border-transparent outline-none transition-all-custom text-slate-800 text-center text-base"
            />
          </div>
        </div>

        {/* Phone Number */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1">
              <Phone size={14} className="text-punjab-green" />
              Operator Phone Number
            </span>
            <span dir="rtl" className="urdu-text text-[11px] leading-3 text-slate-400 text-right">فون نمبر (مثال: 0300-xxxxxxx)</span>
          </div>
          <div className="relative mt-1">
            <input
              type="tel"
              required
              maxLength={15}
              placeholder="0300-xxxxxxx"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full pl-3 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-punjab-green-light focus:border-transparent outline-none transition-all-custom text-slate-800 text-center text-lg"
            />
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-left cursor-pointer hover:bg-white transition-colors">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-punjab-green focus:ring-punjab-green"
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <MonitorSmartphone size={14} className="text-punjab-blue" />
              Remember this school for 15 days
            </span>
            <span className="mt-0.5 block text-[10px] leading-4 text-slate-400">
              Same browser par EMIS, school name, and phone auto-fill ho jayenge.
            </span>
          </span>
        </label>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-punjab-blue to-punjab-green hover:from-punjab-blue-dark hover:to-punjab-green-dark text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all-custom disabled:opacity-75 disabled:cursor-not-allowed group"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span>Verifying ...</span>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center">
                <span className="text-sm font-semibold tracking-wide flex items-center gap-2">
                  Enter Dashboard <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </span>
                <span className="urdu-text text-[10px] leading-3 text-white/80 font-normal">ڈیش بورڈ میں داخل ہوں</span>
              </div>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setShowBuyMore(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 shadow-sm transition-colors hover:bg-amber-100"
        >
          <CreditCard size={17} />
          Buy More
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-amber-700">
            Rs. 200 = +150
          </span>
        </button>

        <button
          type="button"
          onClick={() => setShowProblemForm(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-700 shadow-sm transition-colors hover:bg-red-100"
        >
          <Bug size={17} />
          Report a Problem
        </button>
      </form>

      {activity && (
        <div className="px-6 pb-5 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400">Schools</p>
              <p className="text-lg font-bold text-punjab-blue">{activity.total_schools}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400">Sessions</p>
              <p className="text-lg font-bold text-punjab-green">{activity.total_sessions}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400">Photos</p>
              <p className="text-lg font-bold text-slate-800">{activity.total_images}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <History size={14} className="text-punjab-blue" />
                Recent Schools
              </p>
              <p dir="rtl" className="urdu-text text-[10px] leading-3 text-slate-400 text-right">حالیہ سکولز</p>
            </div>

            {activity.recent_sessions?.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {activity.recent_sessions.slice(0, 3).map((item, index) => (
                  <div key={`${item.emis_code}-${item.created_at}-${index}`} className="py-2 flex items-center gap-2 text-xs">
                    <School size={14} className="text-punjab-green shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-700 truncate">EMIS {item.emis_code}</p>
                      <p className="text-[10px] text-slate-400">
                        {item.processed_count || 0} photos created
                        {formatDate(item.created_at) ? ` · ${formatDate(item.created_at)}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 py-3 text-center">
                No school activity recorded yet.
              </p>
            )}
          </div>
        </div>
      )}
      
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <button
          type="button"
          onClick={onAdminOpen}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 -ml-2 text-[11px] font-bold text-slate-500 hover:bg-white hover:text-punjab-blue transition-colors"
          title="Admin records login"
        >
          <LockKeyhole size={12} />
          Admin Login
        </button>
        <span className="urdu-text text-[10px] leading-3">پاس ورڈ کی ضرورت نہیں ہے</span>
      </div>

      {showBuyMore && (
        <BuyMoreDialog onClose={() => setShowBuyMore(false)} />
      )}

      {showProblemForm && (
        <ProblemReportDialog
          initialEmisCode={emisCode}
          initialSchoolName={schoolName}
          initialPhoneNumber={phoneNumber}
          machineId={getMachineId()}
          machineType={getMachineType()}
          onClose={() => setShowProblemForm(false)}
        />
      )}
    </div>
  );
}
