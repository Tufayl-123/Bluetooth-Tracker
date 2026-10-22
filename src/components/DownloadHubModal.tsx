import React from 'react';
import { Download, X, Terminal, Smartphone, Laptop, Code2, Check, ExternalLink } from 'lucide-react';
import { PYTHON_RADAR_SCRIPTS } from '../utils/pythonScripts';

interface DownloadHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPythonLab: () => void;
}

export const DownloadHubModal: React.FC<DownloadHubModalProps> = ({
  isOpen,
  onClose,
  onOpenPythonLab,
}) => {
  const [downloadedAll, setDownloadedAll] = React.useState(false);

  if (!isOpen) return null;

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/x-python;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllScripts = () => {
    // Sequentially trigger downloads for all Python radar scripts
    PYTHON_RADAR_SCRIPTS.forEach((script, idx) => {
      setTimeout(() => {
        downloadFile(script.filename, script.code);
      }, idx * 250);
    });

    setDownloadedAll(true);
    setTimeout(() => setDownloadedAll(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#070e1b] border-2 border-emerald-500/50 rounded-2xl p-6 max-w-xl w-full shadow-[0_0_50px_rgba(16,185,129,0.2)] relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-mono text-slate-100">
                DOWNLOAD &amp; INSTALL AEROBLE
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Download Python scripts, install the web app to your phone, or export source code.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {/* Option 1: 1-Click Download Python Scripts */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-emerald-500/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold font-mono text-emerald-300">
                    1. Download All Python Scripts (.py)
                  </h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5 leading-relaxed">
                    Downloads all ready-to-run Python radar programs (<code className="text-emerald-400">ble_radar_gui.py</code>, <code className="text-cyan-400">track_laptop_compass.py</code>, <code className="text-amber-400">ble_bridge_server.py</code>).
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3.5 flex flex-wrap gap-2">
              <button
                onClick={handleDownloadAllScripts}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
              >
                {downloadedAll ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                <span>{downloadedAll ? 'Downloaded All Files!' : 'Download All .py Scripts'}</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenPythonLab();
                }}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs flex items-center gap-1.5 transition-colors"
              >
                <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Browse Individual Scripts</span>
              </button>
            </div>
          </div>

          {/* Option: Standalone Single-File HTML */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-amber-500/40">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Code2 className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold font-mono text-amber-300">
                    2. Standalone Single-File HTML (<code className="text-amber-400">bluetooth_radar.html</code>)
                  </h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5 leading-relaxed">
                    A completely self-contained HTML file you can save to your desktop or phone. Double-click to open in Chrome with full radar sweep, Web Bluetooth, and compass pointing!
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3.5">
              <a
                href="/bluetooth_radar.html"
                download="bluetooth_radar.html"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download bluetooth_radar.html</span>
              </a>
            </div>
          </div>

          {/* Option 2: Install as Native App on Your Phone */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-cyan-500/30">
            <div className="flex items-center gap-2.5 mb-2">
              <Smartphone className="w-5 h-5 text-cyan-400 shrink-0" />
              <h4 className="text-sm font-bold font-mono text-cyan-300">
                2. Install on Your Phone (Full-Screen App)
              </h4>
            </div>
            <p className="text-xs text-slate-400 font-mono leading-relaxed mb-3">
              You can install this exact live radar directly to your phone's home screen without an app store:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                <span className="font-bold text-slate-200 block mb-1">🍎 iPhone / iPad:</span>
                <ol className="list-decimal list-inside text-slate-400 space-y-1 text-[11px]">
                  <li>Open this URL in <strong>Safari</strong>.</li>
                  <li>Tap the <strong>Share</strong> button (box with up arrow).</li>
                  <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
                </ol>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                <span className="font-bold text-slate-200 block mb-1">🤖 Android (Chrome):</span>
                <ol className="list-decimal list-inside text-slate-400 space-y-1 text-[11px]">
                  <li>Open this URL in <strong>Chrome</strong>.</li>
                  <li>Tap the <strong>three dots menu (⋮)</strong> top-right.</li>
                  <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Option 3: Download Complete Full-Stack Web Source Code */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800">
            <div className="flex items-center gap-2.5 mb-2">
              <Laptop className="w-5 h-5 text-amber-400 shrink-0" />
              <h4 className="text-sm font-bold font-mono text-amber-300">
                3. Download Complete React Project Code
              </h4>
            </div>
            <p className="text-xs text-slate-400 font-mono leading-relaxed">
              To download or export the entire project codebase (React, TypeScript, Tailwind, Vite):
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400 text-xs font-mono">
              <li>In the <strong>AI Studio Build</strong> interface header, click the project menu or <strong>Export / Download Code</strong> button.</li>
              <li>Or export directly to a <strong>GitHub Repository</strong> to clone with <code className="text-cyan-400">git clone</code>.</li>
            </ul>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
