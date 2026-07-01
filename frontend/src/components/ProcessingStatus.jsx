import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, ShieldCheck, Sparkles, Image, CheckCircle2, Files, Clock3, Cpu, Zap } from 'lucide-react';

export default function ProcessingStatus({ files = [] }) {
  const totalFiles = Math.max(files.length, 1);
  const [processedEstimate, setProcessedEstimate] = useState(0);

  useEffect(() => {
    setProcessedEstimate(0);

    const lastVisibleCount = Math.max(totalFiles - 1, 1);
    const intervalMs = Math.max(2200, Math.min(5200, Math.round(70000 / totalFiles)));
    const timer = window.setInterval(() => {
      setProcessedEstimate((current) => Math.min(current + 1, lastVisibleCount));
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [totalFiles]);

  const activeFile = useMemo(() => {
    if (!files.length) return 'Preparing images';
    const index = Math.min(processedEstimate, files.length - 1);
    return files[index]?.originalName || files[index]?.file?.name || `Image ${index + 1}`;
  }, [files, processedEstimate]);

  const workingOn = Math.min(processedEstimate + 1, totalFiles);
  const progressPercent = Math.max(8, Math.min(96, Math.round((workingOn / totalFiles) * 100)));

  const stepItems = [
    { label: 'Uploaded successfully', icon: CheckCircle2, state: 'done' },
    { label: 'Removing background', icon: Sparkles, state: 'active' },
    { label: 'Resizing to 600x800', icon: Image, state: 'pending' },
    { label: 'Compressing to 11KB - 24KB', icon: ShieldCheck, state: 'pending' },
  ];

  return (
    <div className="w-full max-w-lg mx-auto overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/70">
      <div className="bg-gradient-to-r from-punjab-blue via-teal-700 to-punjab-green px-6 py-5 text-white">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">SBZ Processing Engine</p>
            <h3 className="mt-1 text-2xl font-black tracking-tight">Processing Images</h3>
            <p className="mt-1 text-xs font-medium text-white/75">Background removal, resizing, and compression are running.</p>
          </div>
          <div className="relative h-16 w-16 shrink-0 rounded-2xl bg-white/15 flex items-center justify-center">
            <Loader2 className="animate-spin text-white" size={34} />
            <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20" />
          </div>
        </div>
      </div>

      <div className="p-6 text-center space-y-5">
        <div className="grid grid-cols-3 gap-2 text-left">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-slate-400">
              <Files size={14} />
              <span className="text-[10px] font-bold uppercase">Files</span>
            </div>
            <p className="mt-2 text-lg font-black text-slate-800">{totalFiles}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock3 size={14} />
              <span className="text-[10px] font-bold uppercase">Status</span>
            </div>
            <p className="mt-2 text-sm font-black text-punjab-blue">Active</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-slate-400">
              <Zap size={14} />
              <span className="text-[10px] font-bold uppercase">Mode</span>
            </div>
            <p className="mt-2 text-sm font-black text-punjab-green">Fast</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Current file</p>
              <p className="mt-1 truncate text-sm font-black text-slate-800" title={activeFile}>
                {activeFile}
              </p>
            </div>
            <div className="shrink-0 rounded-2xl bg-punjab-green/10 px-3 py-2 text-right">
              <p className="text-xl font-black leading-none text-punjab-green">{workingOn}/{totalFiles}</p>
              <p className="mt-1 text-[10px] font-bold uppercase text-punjab-green/70">files</p>
            </div>
          </div>

          <div className="mt-4 h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-punjab-blue to-punjab-green shadow-sm transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <span>Preparing output</span>
            <span>{progressPercent}%</span>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 text-left">
          <div className="mb-3 flex items-center gap-2 text-xs font-black text-slate-700">
            <Cpu size={15} className="text-punjab-blue" />
            Workflow stages
          </div>
          <div className="space-y-2.5">
            {stepItems.map(({ label, icon: Icon, state }, index) => (
              <div
                key={label}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-xs font-bold ${
                  state === 'done'
                    ? 'border-green-100 bg-green-50 text-punjab-green'
                    : state === 'active'
                      ? 'border-blue-100 bg-blue-50 text-punjab-blue'
                      : 'border-slate-100 bg-white text-slate-400'
                }`}
              >
                <Icon size={15} className={state === 'active' ? 'animate-pulse shrink-0' : 'shrink-0'} />
                <span className="flex-1">{index + 1}. {label}</span>
                {state === 'active' && (
                  <span className="rounded-full bg-white px-2 py-0.5 text-[9px] uppercase tracking-wide text-punjab-blue">
                    Running
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-left">
          <p className="text-xs font-bold text-amber-800">Please keep this window open.</p>
          <p className="mt-1 text-[11px] leading-5 text-amber-700/80">
            First run may take 60-90 seconds while the processing model wakes up. Larger batches become faster after warmup.
          </p>
        </div>

        <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400">
          Workflow optimized by <span className="text-punjab-green">SBZ Tech</span>
        </p>
      </div>
    </div>
  );
}
