import React from 'react';
import { Smartphone, HelpCircle, X, CheckCircle2, Apple, Shield } from 'lucide-react';

interface PhoneVisibilityGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PhoneVisibilityGuide: React.FC<PhoneVisibilityGuideProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#070e1b] border border-cyan-500/50 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold font-mono text-slate-100">
              HOW TO MAKE PHONES SHOW THEIR REAL NAME
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs font-mono">
          {/* Why it happens */}
          <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl text-slate-300 leading-relaxed">
            <p>
              Smartphones use privacy defenses: when idle, they emit scrambled addresses and hide their real name so strangers can't track them.
              Follow these simple steps on your phone so it broadcasts its real name:
            </p>
          </div>

          {/* iPhone Steps */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-2 text-cyan-300 font-bold mb-2">
              <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center">
                🍎
              </span>
              <span>ON IPHONE / IPAD (iOS)</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
              <li>Open your iPhone <strong>Settings</strong> app.</li>
              <li>Tap on <strong>Bluetooth</strong>.</li>
              <li>
                <strong className="text-emerald-400">Keep this screen open on your phone!</strong> While this screen is in the foreground, iOS broadcasts your iPhone's name to all Bluetooth scanners.
              </li>
              <li>Click <strong>Connect Bluetooth Device</strong> on this radar app.</li>
            </ol>
          </div>

          {/* Android Steps */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-300 font-bold mb-2">
              <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center">
                🤖
              </span>
              <span>ON ANDROID (SAMSUNG, PIXEL, XIAOMI, ETC.)</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
              <li>Open <strong>Settings &gt; Connected Devices &gt; Bluetooth</strong>.</li>
              <li>Tap <strong>"Pair new device"</strong>.</li>
              <li>
                This activates discovery mode and broadcasts your phone's model name (e.g. <em>Galaxy S24</em>, <em>Pixel 8</em>) for 2 minutes.
              </li>
              <li>Now select it in Chrome's Bluetooth window!</li>
            </ol>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
};
