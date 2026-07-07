import React, { useMemo, useState } from 'react';
import { AlertTriangle, Bug, CheckCircle2, ImagePlus, Loader2, Send, X } from 'lucide-react';
import { getApiUrl } from '../utils/api';
import { getApiErrorMessage, getNetworkErrorMessage } from '../utils/apiErrors';

export default function ProblemReportDialog({
  initialEmisCode = '',
  initialSchoolName = '',
  initialPhoneNumber = '',
  machineId = '',
  machineType = '',
  onClose,
}) {
  const initialValues = useMemo(() => ({
    reporterName: '',
    emisCode: initialEmisCode,
    schoolName: initialSchoolName,
    phoneNumber: initialPhoneNumber,
    message: '',
  }), [initialEmisCode, initialPhoneNumber, initialSchoolName]);

  const [form, setForm] = useState(initialValues);
  const [screenshot, setScreenshot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus(null);

    const emisCode = form.emisCode.replace(/\D/g, '');
    const phoneNumber = form.phoneNumber.replace(/\D/g, '');
    const schoolName = form.schoolName.trim().replace(/\s+/g, ' ');

    if (emisCode.length !== 8) {
      setStatus({ type: 'error', message: 'EMIS code must be exactly 8 digits.' });
      return;
    }
    if (phoneNumber.length < 10 || phoneNumber.length > 15) {
      setStatus({ type: 'error', message: 'Phone number must be 10-15 digits.' });
      return;
    }
    if (schoolName.length < 2) {
      setStatus({ type: 'error', message: 'School name is required.' });
      return;
    }
    if (!screenshot) {
      setStatus({ type: 'error', message: 'Please attach a screenshot of the problem.' });
      return;
    }
    if (!screenshot.type.startsWith('image/')) {
      setStatus({ type: 'error', message: 'Screenshot must be an image file.' });
      return;
    }
    if (screenshot.size > 3 * 1024 * 1024) {
      setStatus({ type: 'error', message: 'Screenshot must be 3MB or smaller.' });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('reporter_name', form.reporterName.trim());
      formData.append('emis_code', emisCode);
      formData.append('school_name', schoolName);
      formData.append('phone_number', phoneNumber);
      formData.append('problem_message', form.message.trim());
      formData.append('machine_id', machineId);
      formData.append('machine_type', machineType);
      formData.append('screenshot', screenshot);

      const response = await fetch(getApiUrl('/api/problem-report'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, 'Problem report could not be submitted.'));
      }

      setStatus({ type: 'success', message: 'Problem report sent successfully. Admin will review it.' });
      setForm({
        reporterName: '',
        emisCode,
        schoolName,
        phoneNumber,
        message: '',
      });
      setScreenshot(null);
    } catch (err) {
      setStatus({
        type: 'error',
        message: getNetworkErrorMessage(err, 'Problem report could not be submitted.'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 px-4 py-6 backdrop-blur-sm sm:py-10">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Bug size={19} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">Report a Problem</h3>
              <p className="text-xs font-semibold text-slate-400">Send school details and screenshot to admin.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
            aria-label="Close problem form"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {status && (
            <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${
              status.type === 'success'
                ? 'border-green-100 bg-green-50 text-green-700'
                : 'border-red-100 bg-red-50 text-red-700'
            }`}>
              {status.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
              <span>{status.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-bold text-slate-500">
              Name
              <input
                type="text"
                value={form.reporterName}
                onChange={(event) => updateField('reporterName', event.target.value)}
                placeholder="Operator name"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-punjab-green focus:ring-4 focus:ring-green-50"
              />
            </label>
            <label className="space-y-1 text-xs font-bold text-slate-500">
              EMIS Code
              <input
                type="text"
                value={form.emisCode}
                maxLength={8}
                onChange={(event) => updateField('emisCode', event.target.value.replace(/\D/g, ''))}
                placeholder="33150056"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center font-mono text-sm font-black tracking-widest text-slate-700 outline-none focus:border-punjab-blue focus:ring-4 focus:ring-blue-50"
              />
            </label>
          </div>

          <label className="space-y-1 text-xs font-bold text-slate-500">
            School Name
            <input
              type="text"
              value={form.schoolName}
              onChange={(event) => updateField('schoolName', event.target.value)}
              placeholder="School name"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-punjab-green focus:ring-4 focus:ring-green-50"
            />
          </label>

          <label className="space-y-1 text-xs font-bold text-slate-500">
            Phone Number
            <input
              type="tel"
              value={form.phoneNumber}
              onChange={(event) => updateField('phoneNumber', event.target.value)}
              placeholder="0300xxxxxxx"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center text-sm font-semibold text-slate-700 outline-none focus:border-punjab-green focus:ring-4 focus:ring-green-50"
            />
          </label>

          <label className="space-y-1 text-xs font-bold text-slate-500">
            Problem Details
            <textarea
              rows={3}
              value={form.message}
              onChange={(event) => updateField('message', event.target.value)}
              placeholder="Write what happened..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold leading-5 text-slate-700 outline-none focus:border-punjab-blue focus:ring-4 focus:ring-blue-50"
            />
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-punjab-blue shadow-sm">
              <ImagePlus size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black text-slate-700">
                {screenshot ? screenshot.name : 'Attach screenshot of problem'}
              </p>
              <p className="mt-0.5 text-[10px] font-semibold text-slate-400">Image only, max 3MB</p>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => setScreenshot(event.target.files?.[0] || null)}
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-punjab-blue px-4 py-3 text-sm font-black text-white shadow-lg transition-colors hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Send Problem Report
          </button>
        </form>
      </div>
    </div>
  );
}
