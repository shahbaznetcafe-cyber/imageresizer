import React, { useEffect, useState } from 'react';
import { School, Phone, ArrowRight, Loader2, Images, History } from 'lucide-react';
import { getApiErrorMessage, getNetworkErrorMessage } from '../utils/apiErrors';
import { getApiUrl } from '../utils/api';

export default function LoginRecordForm({ onLoginSuccess }) {
  const [emisCode, setEmisCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activity, setActivity] = useState(null);

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
      formData.append('phone_number', phoneNumber);

      // Determine backend API URL (runs on the same host or relative in production, fallback to local)
      const response = await fetch(getApiUrl('/api/session'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, 'Failed to create session. Please check backend connection.'));
      }

      const session = await response.json();
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

        {/* Phone Number */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1">
              <Phone size={14} className="text-punjab-green" />
              Operator Phone Number
            </span>
            <span className="urdu-text text-[11px] leading-3 text-slate-400">فون نمبر (مثال: 0300-xxxxxxx)</span>
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
                Live Edited Images
              </p>
              <p className="urdu-text text-[10px] leading-3 text-slate-400">تازہ ریکارڈ</p>
            </div>

            {activity.recent_images?.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {activity.recent_images.slice(0, 3).map((item, index) => (
                  <div key={`${item.emis_code}-${item.created_at}-${index}`} className="py-2 flex items-center gap-2 text-xs">
                    <Images size={14} className="text-punjab-green shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-700 truncate">{item.original_name}</p>
                      <p className="text-[10px] text-slate-400">EMIS {item.emis_code} · {item.size_kb} KB</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 py-3 text-center">
                No edited images recorded yet.
              </p>
            )}
          </div>
        </div>
      )}
      
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>No password required</span>
        <span className="urdu-text text-[10px] leading-3">پاس ورڈ کی ضرورت نہیں ہے</span>
      </div>
    </div>
  );
}
