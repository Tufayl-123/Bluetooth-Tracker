import React, { useEffect, useRef } from 'react';
import { TrackedBleDevice } from '../types/bluetooth';
import { getSignalQuality, formatDistance } from '../utils/bleCalculations';
import { radarAudio } from '../utils/audio';
import {
  Target,
  Battery,
  Activity,
  Compass,
  Radio,
  Volume2,
  Copy,
  Check,
  Code,
  Flame,
  X,
  Edit2
} from 'lucide-react';

interface DeviceTrackerProps {
  device: TrackedBleDevice | null;
  onClearTarget: () => void;
  onOpenPythonScriptForDevice: (mac: string) => void;
  soundEnabled: boolean;
  onRenameDevice?: (id: string, newName: string) => void;
}

export const DeviceTracker: React.FC<DeviceTrackerProps> = ({
  device,
  onClearTarget,
  onOpenPythonScriptForDevice,
  soundEnabled,
  onRenameDevice,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [geigerActive, setGeigerActive] = React.useState(false);
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [editedName, setEditedName] = React.useState('');
  const sparklineCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Play Geiger counter audio ticks if target is locked and geiger is enabled
  useEffect(() => {
    if (!device || !geigerActive || !soundEnabled) return;
    const interval = setInterval(() => {
      radarAudio.playGeigerTick(device.distanceMeters);
    }, Math.min(Math.max(device.distanceMeters * 90, 80), 1200));

    return () => clearInterval(interval);
  }, [device, geigerActive, soundEnabled]);

  // Render RSSI history sparkline
  useEffect(() => {
    const canvas = sparklineCanvasRef.current;
    if (!canvas || !device) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const history = device.rssiHistory || [];
    if (history.length < 2) {
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.fillText('Listening for packets...', 10, height / 2);
      return;
    }

    // Min -100 dBm, Max -40 dBm
    const minDbm = -100;
    const maxDbm = -40;

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    history.forEach((pt, index) => {
      const x = (index / (history.length - 1)) * (width - 8) + 4;
      const normalized = Math.max(0, Math.min(1, (pt.rssi - minDbm) / (maxDbm - minDbm)));
      const y = height - normalized * (height - 12) - 6;

      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill gradient below
    ctx.lineTo(width - 4, height);
    ctx.lineTo(4, height);
    ctx.closePath();
    const fillGrad = ctx.createLinearGradient(0, 0, 0, height);
    fillGrad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
    fillGrad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
    ctx.fillStyle = fillGrad;
    ctx.fill();
  }, [device?.rssiHistory, device]);

  const handleCopyMac = () => {
    if (!device) return;
    navigator.clipboard.writeText(device.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!device) {
    return (
      <div className="bg-[#091222] border border-slate-800/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center h-full min-h-[320px]">
        <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-slate-500">
          <Target className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-200">No Target Locked</h3>
        <p className="text-xs text-slate-400 max-w-[280px] mt-1 leading-relaxed">
          Click any device blip on the radar or choose from the list to lock on, track live signal distance, and start proximity Hot & Cold audio search.
        </p>
      </div>
    );
  }

  const quality = getSignalQuality(device.rssi);

  // Proximity heat percentage: 0% at 15m, 100% at 0.5m
  const proximityHeat = Math.max(0, Math.min(100, Math.round((1 - device.distanceMeters / 15) * 100)));

  return (
    <div className="bg-[#081220] border border-amber-500/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between">
      {/* Background ambient lock glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Target className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-400 tracking-wider">
                  TARGET LOCKED
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {device.source.toUpperCase()}
                </span>
              </div>
              {isEditingName ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="px-2 py-0.5 bg-slate-950 border border-emerald-500 rounded text-xs font-mono text-slate-100 focus:outline-none w-36"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editedName.trim() && onRenameDevice) {
                          onRenameDevice(device.id, editedName.trim());
                        }
                        setIsEditingName(false);
                      }
                      if (e.key === 'Escape') setIsEditingName(false);
                    }}
                  />
                  <button
                    onClick={() => {
                      if (editedName.trim() && onRenameDevice) {
                        onRenameDevice(device.id, editedName.trim());
                      }
                      setIsEditingName(false);
                    }}
                    className="p-1 rounded bg-emerald-600 text-slate-950 hover:bg-emerald-500"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <h2 className="text-lg font-bold text-slate-100 truncate max-w-[200px]">
                    {device.name}
                  </h2>
                  <button
                    onClick={() => {
                      setEditedName(device.name);
                      setIsEditingName(true);
                    }}
                    className="text-slate-500 hover:text-slate-300 p-0.5"
                    title="Rename device"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClearTarget}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Release Lock"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MAC Address Bar */}
        <div className="mt-3 flex items-center justify-between px-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs font-mono">
          <span className="text-slate-400 truncate max-w-[210px]">{device.id}</span>
          <button
            onClick={handleCopyMac}
            className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Hot & Cold Proximity Radar Bar */}
        <div className="mt-4 p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
              <Flame className={`w-4 h-4 ${proximityHeat > 70 ? 'text-rose-500 animate-bounce' : proximityHeat > 40 ? 'text-amber-500' : 'text-cyan-400'}`} />
              <span>PROXIMITY SEARCH (HOT / COLD)</span>
            </div>
            <span className="font-bold text-emerald-400">{proximityHeat}% CLOSE</span>
          </div>

          {/* Color Gradient Track */}
          <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${proximityHeat}%`,
                background:
                  proximityHeat > 75
                    ? 'linear-gradient(90deg, #06b6d4, #f59e0b, #ef4444)'
                    : proximityHeat > 35
                    ? 'linear-gradient(90deg, #06b6d4, #10b981, #f59e0b)'
                    : '#06b6d4',
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-1">
            <span>COLD (&gt;15m)</span>
            <span>WARM</span>
            <span>HOT (IMMEDIATE)</span>
          </div>

          {/* Geiger Audio Toggle */}
          <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-800/60">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Geiger Proximity Audio</span>
            </div>
            <button
              onClick={() => setGeigerActive(!geigerActive)}
              className={`px-2.5 py-0.5 rounded text-xs font-mono font-semibold transition-all ${
                geigerActive
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {geigerActive ? 'ACTIVE TICKS' : 'MUTED'}
            </button>
          </div>
        </div>

        {/* Telemetry Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
              <Radio className="w-3 h-3 text-cyan-400" />
              <span>EST. DISTANCE</span>
            </div>
            <div className="text-lg font-bold font-mono text-cyan-300 mt-0.5">
              {formatDistance(device.distanceMeters)}
            </div>
          </div>

          <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>SIGNAL (RSSI)</span>
            </div>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <span>{device.rssi} dBm</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                {quality.label}
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
              <Compass className="w-3 h-3 text-amber-400" />
              <span>RADAR BEARING</span>
            </div>
            <div className="text-sm font-bold font-mono text-slate-200 mt-0.5">
              {device.angleDegrees}° Azimuth
            </div>
          </div>

          <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
              <Battery className="w-3 h-3 text-emerald-400" />
              <span>BATTERY LEVEL</span>
            </div>
            <div className="text-sm font-bold font-mono text-slate-200 mt-0.5">
              {device.batteryLevel ? `${device.batteryLevel}%` : 'N/A (Broadcast)'}
            </div>
          </div>
        </div>

        {/* Real-Time Signal History Sparkline */}
        <div className="mt-3 p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5">
            <span>LIVE RSSI RF SPECTRUM (PAST 30s)</span>
            <span className="text-emerald-400">{device.rssi} dBm</span>
          </div>
          <canvas
            ref={sparklineCanvasRef}
            width={320}
            height={48}
            className="w-full h-12 rounded bg-slate-900/60"
          />
        </div>
      </div>

      {/* Action Footer: Connect or Generate Python Script */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
        <button
          onClick={() => onOpenPythonScriptForDevice(device.id)}
          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)]"
        >
          <Code className="w-4 h-4" />
          <span>Python Tracker Script for this MAC</span>
        </button>
      </div>
    </div>
  );
};
