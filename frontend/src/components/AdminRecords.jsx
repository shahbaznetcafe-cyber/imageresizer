import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bug,
  CheckCircle2,
  Database,
  Download,
  Eye,
  LockKeyhole,
  MessageSquareText,
  RefreshCw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Star,
  X,
} from 'lucide-react';
import { getApiUrl } from '../utils/api';
import { getApiErrorMessage } from '../utils/apiErrors';

function formatDate(value) {
  if (!value) return 'N/A';
  try {
    return new Intl.DateTimeFormat('en-PK', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function downloadCsv(rows) {
  const headers = [
    'EMIS Code',
    'School Name',
    'Phone Number',
    'Machine Type',
    'Machine ID',
    'Machine Count',
    'Sessions',
    'Images Recorded',
    'Session Count',
    'First Session At',
    'Last Session At',
    'Total Size KB',
    'Last Processed At',
  ];

  const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const body = rows.map((row) => [
    row.emis_code,
    row.school_name,
    row.phone_number,
    row.machine_type,
    row.machine_id,
    row.machine_count,
    row.session_count,
    row.images_recorded,
    row.session_processed_count,
    row.first_session_at,
    row.last_session_at,
    row.total_size_kb,
    row.last_processed_at,
  ].map(escapeCell).join(','));

  const csv = [headers.map(escapeCell).join(','), ...body].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `pectaa-school-records-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatEventType(value) {
  return String(value || 'error')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function errorTone(severity) {
  if (severity === 'block') {
    return {
      border: 'border-red-100',
      bg: 'bg-red-50/70',
      icon: 'bg-red-100 text-red-700',
      badge: 'bg-red-100 text-red-700',
    };
  }
  if (severity === 'error') {
    return {
      border: 'border-orange-100',
      bg: 'bg-orange-50/70',
      icon: 'bg-orange-100 text-orange-700',
      badge: 'bg-orange-100 text-orange-700',
    };
  }
  return {
    border: 'border-amber-100',
    bg: 'bg-amber-50/50',
    icon: 'bg-amber-100 text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
  };
}

function LimitRequestCard({ item, device, saving, onApprove }) {
  const suggestedLimit = Number(device?.photo_limit || 35) + Number(item.requested_extra || 150);
  const [nextLimit, setNextLimit] = useState(suggestedLimit);
  const remaining = Math.max(Number(device?.photo_limit || 0) - Number(device?.photos_used || 0), 0);
  const isPending = item.status === 'pending';

  return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-black text-slate-800">EMIS {item.emis_code}</span>
            <span className={`rounded-full px-2 py-1 text-[10px] font-black ${
              isPending ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
            }`}>
              {item.status}
            </span>
            {item.school_name && (
              <span className="max-w-64 truncate rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-500" title={item.school_name}>
                {item.school_name}
              </span>
            )}
          </div>

          <p className="mt-2 text-xs font-semibold text-slate-500">
            Login phone <span className="font-mono text-slate-700">{item.phone_number}</span>
            <span className="mx-2 text-slate-300">|</span>
            Requested +{item.requested_extra || 150} photos
            <span className="mx-2 text-slate-300">|</span>
            {formatDate(item.created_at)}
          </p>

          <div className="mt-3 grid gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-3 text-xs font-bold text-blue-900 sm:grid-cols-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-blue-400">Payer name</p>
              <p className="mt-1 truncate">{item.payment_sender_name || 'Not written'}</p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-blue-400">Sender phone</p>
              <p className="mt-1 font-mono">{item.payment_sender_phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-blue-400">Transaction ID</p>
              <p className="mt-1 truncate font-mono">{item.payment_transaction_id || 'N/A'}</p>
            </div>
          </div>

          {item.message && (
            <p className="mt-3 whitespace-pre-wrap rounded-xl bg-white px-3 py-2 text-sm font-semibold leading-6 text-slate-700">
              {item.message}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-400">
            <span>{device?.machine_type || item.machine_type || 'Unknown machine'}</span>
            {item.machine_id && <span className="max-w-xs truncate font-mono">Machine: {item.machine_id}</span>}
            {item.ip_address && <span className="font-mono">IP: {item.ip_address}</span>}
          </div>
        </div>

        <div className="w-full lg:w-72 rounded-2xl border border-white bg-white p-3 shadow-sm">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 p-2">
              <p className="text-[9px] font-black uppercase text-slate-400">Limit</p>
              <p className="font-mono text-sm font-black text-slate-800">{device?.photo_limit || 35}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-2">
              <p className="text-[9px] font-black uppercase text-slate-400">Used</p>
              <p className="font-mono text-sm font-black text-amber-600">{device?.photos_used || 0}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-2">
              <p className="text-[9px] font-black uppercase text-slate-400">Left</p>
              <p className="font-mono text-sm font-black text-punjab-green">{remaining}</p>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <input
              type="number"
              min="0"
              max="100000"
              value={nextLimit}
              onChange={(event) => setNextLimit(event.target.value)}
              disabled={!isPending || saving}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs font-black text-slate-700 outline-none focus:border-punjab-green focus:ring-4 focus:ring-green-50 disabled:opacity-60"
            />
            <button
              type="button"
              disabled={!isPending || saving || !device?.id}
              onClick={() => onApprove(device.id, nextLimit, item.id)}
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-punjab-green px-3 py-2 text-xs font-black text-white transition-colors hover:bg-punjab-green-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              Set
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminRecords({ onBack }) {
  const [adminKey, setAdminKey] = useState(() => window.sessionStorage.getItem('pectaa-admin-key') || '');
  const [records, setRecords] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingLimit, setSavingLimit] = useState(null);
  const [showErrorEvents, setShowErrorEvents] = useState(false);
  const [showProblemReports, setShowProblemReports] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState(null);

  const schools = useMemo(() => records?.schools || records?.sessions || [], [records]);
  const feedback = useMemo(() => records?.feedback || [], [records]);
  const limitRequests = useMemo(() => records?.limit_requests || [], [records]);
  const errorEvents = useMemo(() => records?.error_events || [], [records]);
  const problemReports = useMemo(() => records?.problem_reports || [], [records]);
  const deviceLimits = useMemo(() => records?.device_limits || [], [records]);
  const deviceById = useMemo(() => {
    const map = new Map();
    deviceLimits.forEach((item) => map.set(Number(item.id), item));
    return map;
  }, [deviceLimits]);
  const totals = useMemo(() => ([
    { label: 'Schools', value: records?.total_schools || 0 },
    { label: 'Sessions', value: records?.total_sessions || 0 },
    { label: 'Machines', value: records?.total_machines || 0 },
    { label: 'Photos', value: records?.total_images || 0 },
    { label: 'Limit Requests', value: records?.total_limit_requests || 0 },
    { label: 'Feedback', value: records?.total_feedback || 0 },
    { label: 'Errors', value: records?.total_error_events || 0 },
    { label: 'Problems', value: records?.total_problem_reports || 0 },
  ]), [records]);

  const fetchRecords = async (event) => {
    event?.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(getApiUrl('/api/admin/records'), {
        headers: {
          'X-Admin-Key': adminKey.trim(),
        },
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, 'Unable to load records.'));
      }

      const data = await response.json();
      window.sessionStorage.setItem('pectaa-admin-key', adminKey.trim());
      setRecords(data);
    } catch (err) {
      setError(err.message || 'Unable to load records.');
    } finally {
      setLoading(false);
    }
  };

  const approveLimitRequest = async (deviceLimitId, photoLimit, requestId) => {
    setError('');
    setSavingLimit(requestId);

    const formData = new FormData();
    formData.append('device_limit_id', String(deviceLimitId));
    formData.append('photo_limit', String(photoLimit));
    formData.append('request_id', String(requestId));

    try {
      const response = await fetch(getApiUrl('/api/admin/device-limit'), {
        method: 'POST',
        headers: {
          'X-Admin-Key': adminKey.trim(),
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, 'Unable to update device limit.'));
      }

      await fetchRecords();
    } catch (err) {
      setError(err.message || 'Unable to update device limit.');
    } finally {
      setSavingLimit(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      <div className="bg-white border border-slate-100 shadow-xl rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-punjab-blue text-white flex items-center justify-center shadow-sm">
              <Database size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Admin Records</h2>
              <p className="text-xs text-slate-500">Private school, EMIS, phone, machine, and image records.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {records && (
              <>
                <button
                  type="button"
                  onClick={() => setShowProblemReports(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  <Bug size={15} />
                  Problems
                  <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[10px]">
                    {records.total_problem_reports || 0}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowErrorEvents(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-black text-red-700 hover:bg-red-100 transition-colors"
                >
                  <AlertTriangle size={15} />
                  Errors
                  <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[10px]">
                    {records.total_error_events || 0}
                  </span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft size={15} />
              Back
            </button>
            {schools.length > 0 && (
              <button
                type="button"
                onClick={() => downloadCsv(schools)}
                className="inline-flex items-center gap-2 rounded-xl bg-punjab-green px-4 py-2.5 text-xs font-bold text-white hover:bg-punjab-green-dark transition-colors"
              >
                <Download size={15} />
                Export CSV
              </button>
            )}
          </div>
        </div>

        <form onSubmit={fetchRecords} className="mt-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <div className="relative">
            <LockKeyhole size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              placeholder="Enter ADMIN_KEY"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm font-semibold text-slate-700 outline-none focus:border-punjab-green focus:ring-4 focus:ring-green-50"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !adminKey.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-punjab-blue px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            Load Records
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}
      </div>

      {records && (
        <>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
            {totals.map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-[10px] uppercase tracking-wider font-black text-slate-400">{item.label}</p>
                <p className="mt-1 text-2xl font-black text-slate-800">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xl sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <ShieldAlert size={19} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">Photo Limit Requests</h3>
                  <p className="text-xs font-semibold text-slate-400">
                    Schools requesting paid +150 photo upgrades for a machine/IP quota.
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                {records.total_limit_requests || 0} pending
              </span>
            </div>

            <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {limitRequests.map((item) => (
                <LimitRequestCard
                  key={item.id}
                  item={item}
                  device={deviceById.get(Number(item.device_limit_id))}
                  saving={savingLimit === item.id}
                  onApprove={approveLimitRequest}
                />
              ))}

              {!limitRequests.length && (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 px-5 py-8 text-center text-sm font-semibold text-slate-400">
                  <CheckCircle2 size={16} />
                  No photo limit requests yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xl sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-punjab-blue">
                  <MessageSquareText size={19} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">Software Feedback</h3>
                  <p className="text-xs font-semibold text-slate-400">
                    Latest improvement messages submitted by schools.
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">
                {feedback.length} latest
              </span>
            </div>

            <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {feedback.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-black text-slate-800">EMIS {item.emis_code}</span>
                        {item.school_name && (
                          <span className="max-w-72 truncate rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-500" title={item.school_name}>
                            {item.school_name}
                          </span>
                        )}
                        {item.category && (
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-punjab-blue">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">
                        {item.message}
                      </p>
                    </div>

                    <div className="shrink-0 text-left md:text-right">
                      <div className="flex md:justify-end gap-0.5 text-amber-400">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Star
                            key={value}
                            size={13}
                            fill={Number(item.rating || 0) >= value ? 'currentColor' : 'none'}
                            className={Number(item.rating || 0) >= value ? 'text-amber-400' : 'text-slate-300'}
                          />
                        ))}
                      </div>
                      <p className="mt-2 font-mono text-xs font-bold text-slate-600">{item.phone_number}</p>
                      <p className="mt-1 text-[10px] font-semibold text-slate-400">{formatDate(item.created_at)}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-400">
                    <span>{item.machine_type || 'Unknown machine'}</span>
                    {item.machine_id && <span className="max-w-xs truncate font-mono">ID: {item.machine_id}</span>}
                  </div>
                </div>
              ))}

              {!feedback.length && (
                <div className="rounded-xl border border-dashed border-slate-200 px-5 py-8 text-center text-sm font-semibold text-slate-400">
                  No feedback submitted yet.
                </div>
              )}
            </div>
          </div>
          </div>

          <div className="bg-white border border-slate-100 shadow-xl rounded-2xl overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-black text-slate-800">School Records</h3>
                <p className="text-xs font-semibold text-slate-400">
                  {schools.length} schools loaded. Scroll inside this table; CSV still exports all rows.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-punjab-blue">
                Compact table
              </span>
            </div>

            <div className="max-h-[62vh] overflow-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 shadow-sm">
                  <tr>
                    <th className="px-3 py-2 font-black">EMIS</th>
                    <th className="px-3 py-2 font-black">School</th>
                    <th className="px-3 py-2 font-black">Phone</th>
                    <th className="px-3 py-2 font-black">Machine</th>
                    <th className="px-3 py-2 font-black">Sessions</th>
                    <th className="px-3 py-2 font-black">Photos</th>
                    <th className="px-3 py-2 font-black">First</th>
                    <th className="px-3 py-2 font-black">Last</th>
                    <th className="px-3 py-2 font-black">Processed</th>
                    <th className="px-3 py-2 font-black">Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schools.map((row) => (
                    <tr key={row.emis_code} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-2 font-mono font-bold text-slate-800">{row.emis_code}</td>
                      <td className="px-3 py-2 font-semibold text-slate-700 min-w-44">
                        <span className="block max-w-60 truncate" title={row.school_name || ''}>
                          {row.school_name || 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-700">{row.phone_number}</td>
                      <td className="px-3 py-2 min-w-48">
                        <p className="font-semibold text-slate-700">{row.machine_type || 'N/A'}</p>
                        <p className="mt-0.5 max-w-48 truncate font-mono text-[10px] text-slate-400" title={row.machine_id || ''}>
                          {row.machine_id || 'No machine ID'}
                        </p>
                        <p className="mt-0.5 text-[10px] font-bold text-punjab-green">
                          {row.machine_count || 0} machine{Number(row.machine_count || 0) === 1 ? '' : 's'}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 font-black text-punjab-blue">
                          {row.session_count || 0}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-green-50 px-2 py-0.5 font-black text-punjab-green">
                          {row.images_recorded || row.session_processed_count || 0}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500">{formatDate(row.first_session_at)}</td>
                      <td className="px-3 py-2 text-slate-500">{formatDate(row.last_session_at)}</td>
                      <td className="px-3 py-2 text-slate-500">{formatDate(row.last_processed_at)}</td>
                      <td className="px-3 py-2 font-mono text-slate-500">
                        {Number(row.total_size_kb || 0).toFixed(2)} KB
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!schools.length && (
              <div className="px-5 py-8 text-center text-sm font-semibold text-slate-400">
                No records found yet.
              </div>
            )}
          </div>

          {showProblemReports && (
            <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm sm:py-10">
              <div className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-2xl">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <Bug size={19} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800">School Problem Reports</h3>
                      <p className="text-xs font-semibold text-slate-400">
                        Click any school row to view complete report data and screenshot.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                      {records.total_problem_reports || 0} total
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProblemReports(false);
                        setSelectedProblem(null);
                      }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
                      aria-label="Close problem reports"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_380px]">
                  <div className="min-h-0 overflow-y-auto border-b border-slate-100 lg:border-b-0 lg:border-r">
                    <table className="min-w-full text-left text-sm">
                      <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="px-4 py-3 font-black">School</th>
                          <th className="px-4 py-3 font-black">EMIS</th>
                          <th className="px-4 py-3 font-black">Phone</th>
                          <th className="px-4 py-3 font-black">Problem</th>
                          <th className="px-4 py-3 font-black">Date</th>
                          <th className="px-4 py-3 font-black">Open</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {problemReports.map((item) => {
                          const isActive = Number((selectedProblem || problemReports[0])?.id) === Number(item.id);
                          return (
                            <tr
                              key={item.id}
                              onClick={() => setSelectedProblem(item)}
                              className={`cursor-pointer transition-colors hover:bg-amber-50/50 ${isActive ? 'bg-amber-50/70' : ''}`}
                            >
                              <td className="px-4 py-3 text-xs font-black text-slate-800 min-w-48">
                                <span className="block max-w-56 truncate" title={item.school_name || ''}>
                                  {item.school_name || 'N/A'}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs font-black text-slate-700">{item.emis_code}</td>
                              <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600">{item.phone_number}</td>
                              <td className="px-4 py-3 text-xs font-semibold text-slate-600 min-w-64">
                                <span className="block max-w-80 truncate" title={item.problem_message || ''}>
                                  {item.problem_message || 'No written details'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[10px] font-semibold text-slate-400">{formatDate(item.created_at)}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-punjab-blue shadow-sm">
                                  <Eye size={14} />
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {!problemReports.length && (
                      <div className="flex items-center justify-center gap-2 px-5 py-10 text-center text-sm font-semibold text-slate-400">
                        <CheckCircle2 size={16} />
                        No problem reports submitted yet.
                      </div>
                    )}
                  </div>

                  <div className="min-h-0 overflow-y-auto bg-slate-50 p-5">
                    {(() => {
                      const item = selectedProblem || problemReports[0];
                      if (!item) {
                        return (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center text-sm font-semibold text-slate-400">
                            Select a problem report to view full data.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Selected School</p>
                            <h4 className="mt-1 text-base font-black text-slate-800">{item.school_name || 'N/A'}</h4>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                              <div className="rounded-xl bg-slate-50 p-3">
                                <p className="font-black uppercase text-slate-400 text-[9px]">EMIS</p>
                                <p className="mt-1 font-mono font-black text-slate-800">{item.emis_code || 'N/A'}</p>
                              </div>
                              <div className="rounded-xl bg-slate-50 p-3">
                                <p className="font-black uppercase text-slate-400 text-[9px]">Phone</p>
                                <p className="mt-1 font-mono font-black text-slate-800">{item.phone_number || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="mt-3 space-y-1 text-xs font-semibold text-slate-500">
                              <p>Reporter: <span className="font-bold text-slate-700">{item.reporter_name || 'N/A'}</span></p>
                              <p>Date: <span className="font-bold text-slate-700">{formatDate(item.created_at)}</span></p>
                              <p>Machine: <span className="font-mono text-[10px] text-slate-500">{item.machine_type || 'Unknown machine'}</span></p>
                              {item.machine_id && (
                                <p className="break-all">ID: <span className="font-mono text-[10px] text-slate-500">{item.machine_id}</span></p>
                              )}
                              {item.ip_address && (
                                <p>IP: <span className="font-mono text-[10px] text-slate-500">{item.ip_address}</span></p>
                              )}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Problem Details</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">
                              {item.problem_message || 'No written details provided.'}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Screenshot</p>
                            {item.screenshot_data_url ? (
                              <a href={item.screenshot_data_url} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                <img src={item.screenshot_data_url} alt="Problem screenshot" className="max-h-96 w-full object-contain" />
                              </a>
                            ) : (
                              <p className="mt-3 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-semibold text-slate-400">
                                No screenshot attached.
                              </p>
                            )}
                            {item.screenshot_name && (
                              <p className="mt-2 truncate text-[10px] font-semibold text-slate-400" title={item.screenshot_name}>
                                {item.screenshot_name}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {showErrorEvents && (
            <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm sm:py-10">
              <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-red-100 bg-white shadow-2xl">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                      <AlertTriangle size={19} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800">School Error Events</h3>
                      <p className="text-xs font-semibold text-slate-400">
                        Limit, machine, login, and processing problems reported by schools.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                      {records.total_error_events || 0} total
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowErrorEvents(false)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
                      aria-label="Close error events"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 overflow-y-auto p-5">
                  {errorEvents.map((item) => {
                    const tone = errorTone(item.severity);
                    return (
                      <div key={item.id} className={`rounded-2xl border ${tone.border} ${tone.bg} p-4`}>
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-sm font-black text-slate-800">EMIS {item.emis_code || 'N/A'}</span>
                              <span className={`rounded-full px-2 py-1 text-[10px] font-black ${tone.badge}`}>
                                {formatEventType(item.event_type)}
                              </span>
                              {item.school_name && (
                                <span className="max-w-64 truncate rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-500" title={item.school_name}>
                                  {item.school_name}
                                </span>
                              )}
                            </div>

                            <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                              {item.message}
                            </p>

                            {item.context && (
                              <p className="mt-2 whitespace-pre-wrap rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold leading-5 text-slate-600">
                                {item.context}
                              </p>
                            )}

                            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-400">
                              <span>{item.machine_type || 'Unknown machine'}</span>
                              {item.machine_id && <span className="max-w-xs truncate font-mono">Machine: {item.machine_id}</span>}
                              {item.ip_address && <span className="font-mono">IP: {item.ip_address}</span>}
                            </div>
                          </div>

                          <div className="shrink-0 text-left lg:text-right">
                            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${tone.icon}`}>
                              <AlertTriangle size={16} />
                            </div>
                            <p className="mt-2 font-mono text-xs font-bold text-slate-600">{item.phone_number || 'N/A'}</p>
                            <p className="mt-1 text-[10px] font-semibold text-slate-400">{formatDate(item.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {!errorEvents.length && (
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 px-5 py-8 text-center text-sm font-semibold text-slate-400">
                      <CheckCircle2 size={16} />
                      No school error events recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
