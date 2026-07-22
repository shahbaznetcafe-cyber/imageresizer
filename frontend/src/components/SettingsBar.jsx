import React from 'react';
import { Check, Palette, Crop } from 'lucide-react';
import { BACKGROUND_COLORS } from '../utils/backgroundColors';
import { CROP_PRESETS } from '../utils/cropPresets';

export default function SettingsBar({
  backgroundColor,
  onBackgroundColorChange,
  cropPreset,
  onCropPresetChange,
}) {
  return (
    <div className="w-full max-w-2xl mb-6 bg-white rounded-2xl border border-slate-100 px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex items-center gap-2">
          <Palette size={15} className="text-punjab-blue shrink-0" />
          <span className="text-xs font-bold text-slate-700 shrink-0">Colour</span>
          <div className="flex gap-1.5">
            {BACKGROUND_COLORS.map((color) => {
              const isSelected = color.hex === backgroundColor;
              return (
                <button
                  key={color.id}
                  type="button"
                  title={color.labelEn}
                  onClick={() => onBackgroundColorChange(color.hex)}
                  className={`h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all-custom ${
                    isSelected ? 'border-punjab-blue' : 'border-slate-200 hover:border-slate-300'
                  }`}
                  style={{ backgroundColor: color.hex }}
                >
                  {isSelected && (
                    <Check size={12} className={color.id === 'white' ? 'text-punjab-blue' : 'text-white'} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="hidden sm:block h-6 w-px bg-slate-100" />

        <div className="flex items-center gap-2">
          <Crop size={15} className="text-punjab-blue shrink-0" />
          <span className="text-xs font-bold text-slate-700 shrink-0">Size</span>
          <div className="flex gap-1.5">
            {CROP_PRESETS.map((preset) => {
              const isSelected = preset.id === cropPreset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  title={`${preset.width} x ${preset.height}px`}
                  onClick={() => onCropPresetChange(preset)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all-custom ${
                    isSelected
                      ? 'border-punjab-blue bg-blue-50 text-punjab-blue'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                  }`}
                >
                  {preset.labelEn}
                </button>
              );
            })}
          </div>
        </div>

        <span className="urdu-text text-[11px] text-slate-400 ml-auto">رنگ اور کراپ سائز منتخب کریں</span>
      </div>
    </div>
  );
}
