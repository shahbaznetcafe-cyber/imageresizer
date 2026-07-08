import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, CreditCard, Loader2, Send, ShieldAlert } from 'lucide-react';
import { getApiUrl } from '../utils/api';
import { getApiErrorMessage } from '../utils/apiErrors';

export default function LimitRequestForm({ session, quota, isQuotaReached = false, onSubmitted }) {
  const [requestedExtra] = useState(150);
  const [paymentSenderName, setPaymentSenderName] = useState('');
  const [paymentSenderPhone, setPaymentSenderPhone] = useState('');
  const [paymentTransactionId, setPaymentTransactionId] = useState('');
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
    formData.append('payment_sender_name', paymentSenderName.trim());
    formData.append('payment_sender_phone', paymentSenderPhone.trim());
    formData.append('payment_transaction_id', paymentTransactionId.trim());
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
      setPaymentTransactionId('');
      setMessage('');
      onSubmitted?.();
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
          <h2 className="text-xl font-black text-slate-800">
            {isQuotaReached ? 'Free photo limit reached' : 'Request more photos'}
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
            {isQuotaReached
              ? 'This device has completed its free 35-photo quota. Send Rs. 200 by JazzCash or EasyPaisa to request 150 more photos.'
              : 'Send Rs. 200 by JazzCash or EasyPaisa, then submit this request with sender phone and transaction ID.'}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Limit</p>
              <p className="mt-1 font-mono text-lg font-black text-slate-800">{quota?.photo_limit ?? 35}</p>
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
            This free quota is linked with this machine/IP. EMIS, school name, and phone can be corrected without resetting usage.
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
                <p className="mt-1 font-mono text-sm font-black text-slate-800">03001218448</p>
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
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-blue-400">Request identity</p>
          <div className="mt-2 grid gap-2 text-xs font-bold text-blue-900 sm:grid-cols-3">
            <span>EMIS: <span className="font-mono">{session.emis_code}</span></span>
            <span className="truncate">School: {session.school_name || 'N/A'}</span>
            <span>Login phone: <span className="font-mono">{session.phone_number}</span></span>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
            Extra photos required
          </label>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-sm font-black text-slate-700">
            +{requestedExtra} photos after payment verification
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2 text-xs font-black uppercase tracking-wider text-slate-400">
            Payment sender name
            <input
              type="text"
              value={paymentSenderName}
              onChange={(event) => setPaymentSenderName(event.target.value)}
              maxLength={120}
              placeholder="Name shown in JazzCash/EasyPaisa"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-punjab-green focus:ring-4 focus:ring-green-50"
            />
          </label>

          <label className="space-y-2 text-xs font-black uppercase tracking-wider text-slate-400">
            Payment sender phone
            <input
              type="tel"
              value={paymentSenderPhone}
              onChange={(event) => setPaymentSenderPhone(event.target.value)}
              required
              minLength={10}
              maxLength={15}
              placeholder="03001234567"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center font-mono text-sm font-black tracking-widest text-slate-700 outline-none focus:border-punjab-green focus:ring-4 focus:ring-green-50"
            />
          </label>
        </div>

        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
            Transaction ID / reference
          </label>
          <input
            type="text"
            value={paymentTransactionId}
            onChange={(event) => setPaymentTransactionId(event.target.value)}
            maxLength={120}
            placeholder="Optional, but best for quick verification"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-sm font-black text-slate-700 outline-none focus:border-punjab-green focus:ring-4 focus:ring-green-50"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
            Extra message for admin
          </label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            maxLength={1500}
            placeholder="Write any extra payment or school details..."
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
