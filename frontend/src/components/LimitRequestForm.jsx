import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, CreditCard, Loader2, Send, ShieldAlert } from 'lucide-react';
import { getApiUrl } from '../utils/api';
import { getApiErrorMessage } from '../utils/apiErrors';

export default function LimitRequestForm({ session, quota }) {
  const [requestedExtra] = useState(150);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const submitRequest = async (event) => {
    event.preventDefault();
    setStatus('');
    setError('');
    setLoading(true);

    const formData = new FormData();
    formData.append('session_id', session.id);
    formData.append('requested_extra', String(requestedExtra));
    formData.append('message', message.trim());

    try {
      const response = await fetch(getApiUrl('/api/limit-request'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, 'Unable to send limit request.'));
      }

      setStatus('Request sent. Admin will verify payment and add 150 photos to this device quota.');
      setMessage('');
    } catch (err) {
      setError(err.message || 'Unable to send limit request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto rounded-2xl border border-amber-100 bg-white p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <ShieldAlert size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black text-slate-800">Free photo limit reached</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
            This device has completed its free 50-photo quota. Send Rs. 200 by JazzCash or EasyPaisa to request 150 more photos.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Limit</p>
              <p className="mt-1 font-mono text-lg font-black text-slate-800">{quota?.photo_limit ?? 50}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Used</p>
              <p className="mt-1 font-mono text-lg font-black text-amber-600">{quota?.photos_used ?? 0}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Remaining</p>
              <p className="mt-1 font-mono text-lg font-black text-red-600">{quota?.remaining ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-start gap-2 text-xs font-bold text-slate-500">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
          <p>
            EMIS {session.emis_code} is linked with this device. Changing EMIS or phone from this same machine/IP will be refused.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm">
            <CreditCard size={19} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-sm font-black text-slate-800">Quota upgrade package</p>
                <p className="urdu-text mt-1 text-right text-xs font-semibold leading-5 text-amber-800">
                  200 روپے JazzCash یا EasyPaisa کریں، پھر 150 مزید تصاویر کی درخواست بھیجیں۔
                </p>
              </div>
              <span className="inline-flex items-center justify-center rounded-full bg-white px-3 py-1 text-xs font-black text-amber-700 shadow-sm">
                Rs. 200 = +150 photos
              </span>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Account Title</p>
                <p className="mt-1 text-xs font-black text-slate-800">Muhammad Shahbaz Zafar</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">JazzCash</p>
                <p className="mt-1 font-mono text-sm font-black text-slate-800">03007673394</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">EasyPaisa</p>
                <p className="mt-1 font-mono text-sm font-black text-slate-800">03457942747</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={submitRequest} className="mt-5 space-y-4">
        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
            Extra photos required
          </label>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-sm font-black text-slate-700">
            +{requestedExtra} photos after payment verification
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
            Payment proof / message for admin
          </label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            maxLength={1500}
            placeholder="Write payment sender number, transaction ID, or request details..."
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-punjab-green focus:ring-4 focus:ring-green-50"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
            {error}
          </div>
        )}

        {status && (
          <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-xs font-bold text-green-700">
            <CheckCircle2 size={16} />
            {status}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-punjab-blue px-5 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Send Rs. 200 Upgrade Request
        </button>
      </form>
    </div>
  );
}
