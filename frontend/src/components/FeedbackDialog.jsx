import React, { useState } from 'react';
import { CheckCircle2, Lightbulb, Loader2, MessageSquareText, Send, Star, X } from 'lucide-react';
import { getApiUrl } from '../utils/api';
import { getApiErrorMessage } from '../utils/apiErrors';

const categories = [
  'Speed',
  'Photo Quality',
  'Mobile Use',
  'New Feature',
  'Problem Report',
  'Other',
];

export default function FeedbackDialog({ session }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState('Speed');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setRating(0);
    setCategory('Speed');
    setMessage('');
    setError('');
    setStatus('');
  };

  const closeDialog = () => {
    setOpen(false);
    window.setTimeout(resetForm, 200);
  };

  const submitFeedback = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');

    if (!message.trim() || message.trim().length < 5) {
      setError('Please write a short message before sending.');
      return;
    }

    const formData = new FormData();
    formData.append('session_id', session.id);
    formData.append('rating', String(rating));
    formData.append('category', category);
    formData.append('message', message.trim());

    setLoading(true);
    try {
      const response = await fetch(getApiUrl('/api/feedback'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, 'Unable to send feedback.'));
      }

      setStatus('Thank you. Your feedback has been sent to admin records.');
      setMessage('');
    } catch (err) {
      setError(err.message || 'Unable to send feedback.');
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="mt-6 w-full max-w-2xl">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-punjab-blue/40 hover:shadow-md"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-punjab-blue transition-colors group-hover:bg-punjab-blue group-hover:text-white">
              <Lightbulb size={18} />
            </span>
            <span>
              <span className="block text-sm font-black text-slate-800">Feedback to improve this software</span>
              <span className="block text-xs font-semibold text-slate-400">Share issue, idea, speed, or photo quality feedback</span>
            </span>
          </div>
          <MessageSquareText size={18} className="shrink-0 text-slate-300 group-hover:text-punjab-green" />
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 py-6">
          <div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-punjab-blue text-white shadow-sm">
                  <MessageSquareText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Improve This Software</h3>
                  <p className="text-xs font-semibold text-slate-400">
                    EMIS {session.emis_code} feedback will be saved privately.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitFeedback} className="space-y-4 p-5">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                  Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
                        rating >= value
                          ? 'border-amber-300 bg-amber-50 text-amber-500'
                          : 'border-slate-200 bg-white text-slate-300 hover:border-amber-200'
                      }`}
                    >
                      <Star size={17} fill={rating >= value ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                  Feedback Type
                </label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700 outline-none focus:border-punjab-green focus:ring-4 focus:ring-green-50"
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={5}
                  maxLength={1500}
                  placeholder="Write what should be improved..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-punjab-green focus:ring-4 focus:ring-green-50"
                />
                <p className="mt-1 text-right text-[10px] font-semibold text-slate-400">
                  {message.length}/1500
                </p>
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

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-punjab-green px-5 py-2.5 text-xs font-black text-white shadow-sm transition-colors hover:bg-punjab-green-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Send Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
