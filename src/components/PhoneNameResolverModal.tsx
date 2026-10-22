import React, { useState } from 'react';
import { TrackedBleDevice } from '../types/bluetooth';
import { Smartphone, Check, ShieldCheck, Sparkles } from 'lucide-react';

interface PhoneNameResolverModalProps {
  device: TrackedBleDevice | null;
  onConfirmName: (id: string, name: string) => void;
  onDismiss: () => void;
}

const PRESET_NAMES = [
  'My iPhone',
  'iPhone 15 Pro',
  'Samsung Galaxy',
  'Google Pixel',
  'Work Phone',
  'Android Phone',
];

export const PhoneNameResolverModal: React.FC<PhoneNameResolverModalProps> = ({
  device,
  onConfirmName,
  onDismiss,
}) => {
  const [chosenName, setChosenName] = useState(
    device?.name && !device.name.toLowerCase().includes('unknown')
      ? device.name
      : 'My iPhone'
  );

  if (!device) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chosenName.trim()) {
      onConfirmName(device.id, chosenName.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#080f1e] border-2 border-emerald-500/60 rounded-2xl p-6 max-w-md w-full shadow-[0_0_40px_rgba(16,185,129,0.25)] relative">
        {/* Top Icon Badge */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="w-11 h-11 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 shadow-md">
            <Smartphone className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider">
                PHONE IDENTIFIED
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono">
                SUCCESS
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-100">
              Name Your Phone
            </h3>
          </div>
        </div>

        {/* Informative Explanation */}
        <div className="mt-3.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs font-mono text-slate-300 space-y-1.5 leading-relaxed">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Why phones hide their name:</span>
          </div>
          <p className="text-[11px] text-slate-400">
            iPhones &amp; Androids encrypt or hide their broadcast name in public BLE packets to prevent tracking. Choose your phone model below so the radar &amp; wayfinding compass show its real name!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-2">
              QUICK PRESETS:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setChosenName(name)}
                  className={`py-2 px-3 rounded-lg border text-xs font-mono text-left transition-all ${
                    chosenName === name
                      ? 'bg-emerald-950 border-emerald-400 text-emerald-300 font-bold shadow'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Input Field */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              OR TYPE CUSTOM NAME:
            </label>
            <input
              type="text"
              value={chosenName}
              onChange={(e) => setChosenName(e.target.value)}
              placeholder="e.g. Tufayl's Phone"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
              autoFocus
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-mono"
            >
              Skip
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Save &amp; Track Phone</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
