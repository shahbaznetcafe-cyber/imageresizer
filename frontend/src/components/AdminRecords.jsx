import React, { useMemo, useState } from 'react';
import { ArrowLeft, Database, Download, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';
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
    'Phone Number',
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
    row.phone_number,
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

export default function AdminRecords({ onBack }) {
  const [adminKey, setAdminKey] = useState(() => window.sessionStorage.getItem('pectaa-admin-key') || '');
  const [records, setRecords] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const schools = records?.schools || records?.sessions || [];
  const totals = useMemo(() => ([
    { label: 'Schools', value: records?.total_schools || 0 },
    { label: 'Sessions', value: records?.total_sessions || 0 },
    { label: 'Photos', value: records?.total_images || 0 },
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

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5">
      <div className="bg-white border border-slate-100 shadow-xl rounded-2xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-punjab-blue text-white flex items-center justify-center shadow-sm">
              <Database size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Admin Records</h2>
              <p className="text-xs text-slate-500">Private EMIS, phone, and image counts for your Supabase record.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {totals.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-[10px] uppercase tracking-wider font-black text-slate-400">{item.label}</p>
                <p className="mt-1 text-3xl font-black text-slate-800">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-100 shadow-xl rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-black">EMIS</th>
                    <th className="px-4 py-3 font-black">Phone</th>
                    <th className="px-4 py-3 font-black">Sessions</th>
                    <th className="px-4 py-3 font-black">Photos</th>
                    <th className="px-4 py-3 font-black">First Session</th>
                    <th className="px-4 py-3 font-black">Last Session</th>
                    <th className="px-4 py-3 font-black">Last Processed</th>
                    <th className="px-4 py-3 font-black">Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schools.map((row) => (
                    <tr key={row.emis_code} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">{row.emis_code}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">{row.phone_number}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-punjab-blue">
                          {row.session_count || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-black text-punjab-green">
                          {row.images_recorded || row.session_processed_count || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(row.first_session_at)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(row.last_session_at)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(row.last_processed_at)}</td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-500">
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
        </>
      )}
    </div>
  );
}
