import React from 'react';
import { ExternalLink, FileText, GraduationCap, ReceiptText, Sparkles, Store, Wrench } from 'lucide-react';

const products = [
  { label: 'School Management', icon: GraduationCap },
  { label: 'Invoice Maker', icon: ReceiptText },
  { label: 'CV Maker Pro', icon: FileText },
  { label: 'Shop Software', icon: Store },
];

export default function SBZSideRails() {
  return (
    <>
      <aside className="hidden 2xl:block fixed left-10 top-52 z-10 w-48">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-punjab-green text-white flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">SBZ Tech</p>
              <p className="text-[10px] uppercase font-bold text-punjab-green">Free school tools</p>
            </div>
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            Software, forms, and digital utilities for Pakistani schools and operators.
          </p>

          <a
            href="https://shahbaznetcafe.com"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-punjab-blue hover:text-punjab-green transition-colors"
          >
            Visit shahbaznetcafe.com
            <ExternalLink size={12} />
          </a>
        </div>
      </aside>

      <aside className="hidden 2xl:block fixed right-10 top-52 z-10 w-52">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-punjab-blue text-white flex items-center justify-center">
              <Wrench size={18} />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">More Tools</p>
              <p className="text-[10px] uppercase font-bold text-slate-400">By SBZ Tech</p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {products.map(({ label, icon: Icon }) => (
              <a
                key={label}
                href="https://shahbaznetcafe.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:border-punjab-green/30 hover:bg-green-50 hover:text-punjab-green transition-colors"
              >
                <Icon size={14} />
                <span>{label}</span>
              </a>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
