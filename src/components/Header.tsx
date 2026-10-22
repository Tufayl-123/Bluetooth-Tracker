import React from 'react';
import { RadarConfig } from '../types/bluetooth';
import { radarAudio } from '../utils/audio';
import {
  Radar,
  Bluetooth,
  Sliders,
  Volume2,
  VolumeX,
  Radio,
  Terminal,
  Activity,
  Zap,
  Download
} from 'lucide-react';

interface HeaderProps {
  config: RadarConfig;
  onUpdateConfig: (partial: Partial<RadarConfig>) => void;
  onOpenCalibration: () => void;
  onConnectWebBle: () => void;
  isWebBleConnecting: boolean;
  webBleSupported: boolean;
  webBleError: string | null;
  isBridgeConnected: boolean;
  onScrollToPythonLab: () => void;
  onOpenDownloadModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  onUpdateConfig,
  onOpenCalibration,
  onConnectWebBle,
  isWebBleConnecting,
  webBleSupported,
  webBleError,
  isBridgeConnected,
  onScrollToPythonLab,
  onOpenDownloadModal,
}) => {
  return (
    <header className="bg-[#050a14] border-b border-emerald-950/80 px-4 py-3 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand / Title */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Radar className="w-6 h-6 animate-spin text-emerald-400" style={{ animationDuration: '6s' }} />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-wider font-mono text-slate-100 flex items-center gap-1.5">
                <span>AeroBLE</span>
                <span className="text-emerald-400">RADAR</span>
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 font-semibold">
                v2.6 BLE 5.2
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Tactical Bluetooth Device Tracker &amp; Python BLE Engineering Suite
            </p>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Python Bridge status button */}
          <button
            onClick={onScrollToPythonLab}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
              isBridgeConnected
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Python Bridge:</span>
            <span className={isBridgeConnected ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
              {isBridgeConnected ? 'ONLINE' : 'SETUP'}
            </span>
          </button>

          {/* Web Bluetooth Pair Button */}
          <button
            onClick={onConnectWebBle}
            disabled={isWebBleConnecting}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] disabled:opacity-50"
            title="Scan & Connect Real Hardware Device via Browser Web Bluetooth"
          >
            <Bluetooth className="w-3.5 h-3.5" />
            <span>{isWebBleConnecting ? 'Scanning BLE...' : 'Connect Hardware BLE'}</span>
          </button>

          {/* Download App & Scripts Button */}
          <button
            onClick={onOpenDownloadModal}
            className="px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 font-bold font-mono text-xs flex items-center gap-1.5 transition-all shadow"
            title="Download Python Scripts or Install to Phone"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Download</span>
          </button>

          {/* Sweep Speed Selector */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 text-xs font-mono">
            <span className="text-[11px] text-slate-400 px-1.5">RPM:</span>
            {[15, 30, 45].map((rpm) => (
              <button
                key={rpm}
                onClick={() => onUpdateConfig({ sweepSpeedRpm: rpm })}
                className={`px-2 py-0.5 rounded-lg transition-colors ${
                  config.sweepSpeedRpm === rpm
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {rpm}
              </button>
            ))}
          </div>

          {/* Calibration Modal Trigger */}
          <button
            onClick={onOpenCalibration}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-emerald-400 transition-colors"
            title="Calibrate RF Path Loss Exponent & TxPower"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Audio Mute/Unmute */}
          <button
            onClick={() => {
              const muted = !config.soundEnabled;
              onUpdateConfig({ soundEnabled: !muted });
              radarAudio.setMuted(muted);
              if (!muted) radarAudio.playSonarPing();
            }}
            className={`p-2 rounded-xl border transition-all ${
              config.soundEnabled
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title={config.soundEnabled ? 'Mute Sonar Audio' : 'Unmute Sonar Audio'}
          >
            {config.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Web Bluetooth Warning or Error Banner if encountered */}
      {webBleError && (
        <div className="max-w-7xl mx-auto mt-2 px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>{webBleError}</span>
          </div>
          <button
            onClick={onScrollToPythonLab}
            className="underline hover:text-amber-200 ml-3"
          >
            Use Python Scanner instead
          </button>
        </div>
      )}
    </header>
  );
};
