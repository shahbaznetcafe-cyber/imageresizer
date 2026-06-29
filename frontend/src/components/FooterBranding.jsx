import React from 'react';

export default function FooterBranding() {
  return (
    <footer className="w-full mt-12 py-6 border-t border-slate-200 bg-white/70 backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <p className="text-sm font-semibold text-punjab-green tracking-wide uppercase">
          Free Tool for SED Punjab Schools
        </p>
        <p className="mt-2 text-xs text-slate-500 font-medium">
          Designed by <span className="font-semibold text-slate-700">MS Zafar</span>
          <span className="mx-2 text-slate-300">|</span>
          Powered by <span className="font-semibold text-slate-700">SBZ Tech</span>
          <span className="mx-2 text-slate-300">|</span>
          Phone <span className="font-semibold text-slate-700">0345-7942747</span>
        </p>
        <p className="mt-1 text-[10px] text-slate-400">
          SBZ Tech. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
