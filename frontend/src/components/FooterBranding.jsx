import React from 'react';

export default function FooterBranding() {
  return (
    <footer className="w-full mt-12 py-6 border-t border-slate-200 bg-white/70 backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <p className="text-sm font-semibold text-punjab-green tracking-wide uppercase">
          Free Tool for SED Punjab Schools
        </p>
        <div className="mt-3 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-slate-500 font-medium">
          <span>
            Designed by <span className="font-semibold text-slate-700">MS Zafar</span>
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-punjab-green/20 bg-punjab-green/5 px-3 py-1 text-punjab-green font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-punjab-green" />
            Powered by SBZ Tech
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span>
            Phone <span className="font-semibold text-slate-700">0345-7942747</span>
          </span>
        </div>
        <p className="mt-1 text-[10px] text-slate-400">
          Digital school tools by SBZ Tech. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
