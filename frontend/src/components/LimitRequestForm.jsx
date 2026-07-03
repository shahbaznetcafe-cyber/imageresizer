import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Send, ShieldAlert } from 'lucide-react';
import { getApiUrl } from '../utils/api';
import { getApiErrorMessage } from '../utils/apiErrors';

export default function LimitRequestForm({ session, quota }) {
  const [requestedExtra, setRequestedExtra] = useState(50);
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

      setStatus('Request sent. Admin can review it and increase this device limit.');
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
            This device has completed its free lifetime quota. Please send a request if this school needs more photos.
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

      <form onSubmit={submitRequest} className="mt-5 space-y-4">
        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
            Extra photos required
          </label>
          <input
            type="number"
            min="1"
            max="1000"
            value={requestedExtra}
            onChange={(event) => setRequestedExtra(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-sm font-bold text-slate-700 outline-none focus:border-punjab-green focus:ring-4 focus:ring-green-50"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
            Message for admin
          </label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            maxLength={1500}
            placeholder="Write why extra photos are needed..."
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
          Send Limit Increase Request
        </button>
      </form>
    </div>
  );
}
