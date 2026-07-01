import React from 'react';
import { ExternalLink, FileText, GraduationCap, ReceiptText, Store } from 'lucide-react';

const tools = [
  { label: 'School Management', icon: GraduationCap },
  { label: 'Invoice Maker', icon: ReceiptText },
  { label: 'CV Maker Pro', icon: FileText },
  { label: 'Shop Software', icon: Store },
];

export default function SBZTrafficStrip() {
  return (
    <section className="w-full px-4 pb-2">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="text-center md:text-left">
            <p className="text-sm font-black text-slate-800">More school & office tools by SBZ Tech</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Need software, forms, invoice tools, or CV services? Visit shahbaznetcafe.com.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {tools.map(({ label, icon: Icon }) => (
              <a
                key={label}
                href="https://shahbaznetcafe.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-600 transition-colors hover:border-punjab-green/30 hover:bg-green-50 hover:text-punjab-green"
              >
                <Icon size={13} />
                <span>{label}</span>
              </a>
            ))}
            <a
              href="https://shahbaznetcafe.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-punjab-blue px-3 py-2 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-punjab-green"
            >
              Visit Website
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
