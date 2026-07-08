import React from 'react';
import { CreditCard, Info, X } from 'lucide-react';

export default function BuyMoreDialog({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 px-4 py-6 backdrop-blur-sm sm:py-10">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <CreditCard size={19} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">Buy More Photos</h3>
              <p className="text-xs font-semibold text-slate-400">35 photos free. Upgrade after payment verification.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
            aria-label="Close payment details"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-slate-800">Quota upgrade package</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-amber-800">
                  Send Rs. 200 by JazzCash or EasyPaisa, then submit an upgrade request after login.
                </p>
              </div>
              <span className="inline-flex items-center justify-center rounded-full bg-white px-3 py-1 text-xs font-black text-amber-700 shadow-sm">
                Rs. 200 = +150 photos
              </span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Account Title</p>
              <p className="mt-1 text-xs font-black text-slate-800">Muhammad Shahbaz Zafar</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">JazzCash</p>
              <p className="mt-1 font-mono text-sm font-black text-slate-800">03001218448</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">EasyPaisa</p>
              <p className="mt-1 font-mono text-sm font-black text-slate-800">03457942747</p>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-xs font-bold leading-5 text-blue-800">
            <Info size={16} className="mt-0.5 shrink-0" />
            <p>
              After payment, log in with your school EMIS and send the upgrade request with payment sender phone and transaction ID.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
