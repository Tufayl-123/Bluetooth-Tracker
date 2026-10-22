import React, { useRef } from 'react';
import { TrackedBleDevice, OrientationData, WayfindingGuidance } from '../types/bluetooth';
import { formatDistance, getSignalQuality } from '../utils/bleCalculations';
import {
  Compass,
  Navigation,
  Footprints,
  RotateCw,
  RotateCcw,
  Sliders,
  Smartphone,
  Laptop,
  CheckCircle2,
  Crosshair,
  Volume2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface NavigationCompassProps {
  device: TrackedBleDevice | null;
  orientation: OrientationData;
  guidance: WayfindingGuidance;
  effectiveHeading: number;
  manualHeading: number | null;
  targetLaptopBearing: number;
  isCalibrated: boolean;
  invertedCompass: boolean;
  onSetManualHeading: (heading: number | null) => void;
  onAimAtLaptop: () => void;
  onSetLaptopBearingDirectly: (bearing: number) => void;
  onNudgeBearing: (delta: number) => void;
  onToggleInvertedCompass: () => void;
  onRequestPermission: () => void;
}

export const NavigationCompass: React.FC<NavigationCompassProps> = ({
  device,
  orientation,
  guidance,
  effectiveHeading,
  manualHeading,
  targetLaptopBearing,
  isCalibrated,
  invertedCompass,
  onSetManualHeading,
  onAimAtLaptop,
  onSetLaptopBearingDirectly,
  onNudgeBearing,
  onToggleInvertedCompass,
  onRequestPermission,
}) => {
  const dialRef = useRef<HTMLDivElement | null>(null);

  if (!device) return null;

  const quality = getSignalQuality(device.rssi);
  // Pointer needle angle relative to top of phone
  const needleRotation = guidance.relativeAngle;

  // Handle clicking directly on the compass dial to aim at laptop
  const handleDialClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;

    // Angle from top (0 deg is top)
    let angleRad = Math.atan2(dx, -dy);
    let angleDeg = (angleRad * 180) / Math.PI;
    if (angleDeg < 0) angleDeg += 360;

    // Room bearing = (current phone heading + relative angle)
    const absoluteBearing = (effectiveHeading + angleDeg) % 360;
    onSetLaptopBearingDirectly(Math.round(absoluteBearing));
  };

  return (
    <div className="bg-[#050b16] border-2 border-cyan-500/50 rounded-2xl p-5 shadow-[0_0_35px_rgba(6,182,212,0.18)] relative overflow-hidden">
      {/* Background radial beacon glow */}
      <div
        className={`absolute -top-12 -right-12 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-all duration-500 ${
          guidance.isFacingTarget ? 'bg-emerald-500/20' : 'bg-cyan-500/15'
        }`}
      />

      {/* Primary Aim & Lock Banner if not calibrated */}
      {!isCalibrated ? (
        <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border border-amber-500/60 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/60 flex items-center justify-center text-amber-400 shrink-0">
              <Crosshair className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-amber-400 tracking-wider">
                POINTING CALIBRATION
              </div>
              <p className="text-xs text-slate-200 font-mono mt-0.5">
                Point top edge of your phone directly at <strong>{device.name}</strong>, then tap button to lock direction.
              </p>
            </div>
          </div>

          <button
            onClick={onAimAtLaptop}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black font-mono text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all transform active:scale-95"
          >
            <Crosshair className="w-4 h-4" />
            <span>AIM AT {device.name.toUpperCase().slice(0, 16)}</span>
          </button>
        </div>
      ) : (
        <div className="mb-4 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              LOCKED TO {device.name.toUpperCase()}: <strong>{Math.round(targetLaptopBearing)}°</strong>
            </span>
          </div>
          <button
            onClick={onAimAtLaptop}
            className="text-xs text-emerald-400 underline hover:text-emerald-300 font-bold"
          >
            Re-Aim at {device.name}
          </button>
        </div>
      )}

      {/* Main Wayfinding Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Interactive 3D Compass Radar Dial */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div
            ref={dialRef}
            onClick={handleDialClick}
            className="relative w-60 h-60 flex items-center justify-center cursor-pointer select-none group"
            title="Click anywhere on the dial to manually aim at laptop"
          >
            {/* Outer Compass Degree Ring (rotates opposite of phone heading so North stays fixed to the room) */}
            <div
              className="absolute inset-0 rounded-full border-2 border-slate-700 bg-slate-950/80 shadow-inner flex items-center justify-center transition-transform duration-75"
              style={{ transform: `rotate(${-effectiveHeading}deg)` }}
            >
              {/* Cardinal markings */}
              <span className="absolute top-1.5 text-xs font-mono font-bold text-emerald-400">N (0°)</span>
              <span className="absolute right-2 text-xs font-mono text-cyan-400">E (90°)</span>
              <span className="absolute bottom-1.5 text-xs font-mono text-slate-400">S (180°)</span>
              <span className="absolute left-2 text-xs font-mono text-cyan-400">W (270°)</span>

              {/* Ticks */}
              <div className="w-full h-px bg-slate-800" />
              <div className="h-full w-px bg-slate-800 absolute" />
            </div>

            {/* Inner Circular Reticle */}
            <div
              className={`w-44 h-44 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                guidance.isFacingTarget
                  ? 'border-emerald-400 bg-emerald-950/30 shadow-[0_0_35px_rgba(16,185,129,0.35)]'
                  : 'border-cyan-500/50 bg-[#071324]/90'
              }`}
            >
              {/* Pointer Needle that points straight at the Laptop */}
              <div
                className="relative w-full h-full flex items-center justify-center transition-transform duration-100 ease-out"
                style={{ transform: `rotate(${needleRotation}deg)` }}
              >
                {/* Arrow Pointer Head */}
                <div className="absolute top-1 flex flex-col items-center">
                  <div
                    className={`w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-b-[36px] transition-all drop-shadow-lg ${
                      guidance.isFacingTarget
                        ? 'border-b-emerald-400 drop-shadow-[0_0_16px_#10b981]'
                        : 'border-b-cyan-400 drop-shadow-[0_0_14px_#06b6d4]'
                    }`}
                  />
                  <div
                    className={`w-2 h-14 ${
                      guidance.isFacingTarget ? 'bg-emerald-400' : 'bg-cyan-400'
                    }`}
                  />
                </div>

                {/* Center Device Emblem */}
                <div
                  className={`w-12 h-12 rounded-full border-2 flex items-center justify-center z-10 shadow-lg ${
                    guidance.isFacingTarget
                      ? 'bg-emerald-900 border-emerald-400 text-emerald-200'
                      : 'bg-slate-900 border-cyan-400 text-cyan-200'
                  }`}
                >
                  {device.category === 'phone' ? (
                    <Smartphone className="w-6 h-6 animate-pulse" />
                  ) : device.category === 'laptop' || device.category === 'desktop' ? (
                    <Laptop className="w-6 h-6 animate-pulse" />
                  ) : (
                    <Compass className="w-6 h-6 animate-pulse" />
                  )}
                </div>
              </div>
            </div>

            {/* Phone Forward Screen Reference Marker (Top of phone) */}
            <div className="absolute -top-3 px-2.5 py-0.5 rounded-full bg-slate-900 border border-cyan-500 text-[10px] font-mono text-cyan-300 flex items-center gap-1 z-20 shadow-md">
              <Smartphone className="w-3 h-3 text-cyan-400" />
              <span>TOP OF PHONE</span>
            </div>
          </div>

          {/* Micro-Adjust Buttons below Dial */}
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => onNudgeBearing(-15)}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-1"
              title="Nudge laptop direction 15° Left"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span>-15°</span>
            </button>

            <button
              onClick={onAimAtLaptop}
              className="px-3 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 text-xs font-mono text-emerald-300 font-bold"
            >
              Center Aim
            </button>

            <button
              onClick={() => onNudgeBearing(15)}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-1"
              title="Nudge laptop direction 15° Right"
            >
              <span>+15°</span>
              <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>
        </div>

        {/* Right Column: Directional Steering Banner & Metrics */}
        <div className="lg:col-span-7 space-y-4">
          {/* Turn-by-Turn Instruction Banner */}
          <div
            className={`p-5 rounded-2xl border-2 transition-all ${
              guidance.isFacingTarget
                ? 'bg-emerald-950/60 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            <div className="text-xs font-mono font-bold tracking-wider mb-1 flex items-center justify-between">
              <span className={guidance.isFacingTarget ? 'text-emerald-400 font-black' : 'text-cyan-400'}>
                {guidance.isFacingTarget ? `✓ ON TARGET (FACING ${device.name.toUpperCase()})` : 'STEERING INSTRUCTION'}
              </span>
              <span className="text-slate-400 font-mono text-xs">
                Needle: {Math.round(guidance.relativeAngle)}°
              </span>
            </div>

            <div
              className={`text-2xl font-black font-mono tracking-tight leading-snug ${
                guidance.isFacingTarget ? 'text-emerald-300' : 'text-slate-100'
              }`}
            >
              {guidance.instruction}
            </div>

            <p className="text-xs text-slate-400 mt-2 font-mono leading-relaxed">
              {guidance.isFacingTarget
                ? `Your phone is pointing straight at ${device.name}. Walk straight forward towards it!`
                : 'Turn your body until the large arrow points straight UP.'}
            </p>
          </div>

          {/* Distance & Steps Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
              <div className="text-[10px] font-mono text-slate-400">ESTIMATED DISTANCE</div>
              <div className="text-xl font-bold font-mono text-cyan-300 mt-0.5">
                {formatDistance(device.distanceMeters)}
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: quality.color }} />
                <span>{device.rssi} dBm ({quality.label})</span>
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
              <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <Footprints className="w-3.5 h-3.5 text-emerald-400" />
                <span>WALKING PACING</span>
              </div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                ~{guidance.stepsEstimate} Steps
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-1">
                Based on 0.75m per stride
              </div>
            </div>
          </div>

          {/* Sensor Diagnostics, Inversion Toggle & Manual Rotation */}
          <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  {orientation.hasSensor ? 'Physical Sensor: ACTIVE' : 'Manual Heading Mode'}
                </span>
              </span>

              <div className="flex items-center gap-2">
                {/* Invert Axis Button */}
                <button
                  onClick={onToggleInvertedCompass}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    invertedCompass
                      ? 'bg-amber-950 border border-amber-500 text-amber-300'
                      : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Flip clockwise/counter-clockwise orientation"
                >
                  Invert Axis: {invertedCompass ? 'ON' : 'OFF'}
                </button>

                {!orientation.hasSensor && (
                  <button
                    onClick={onRequestPermission}
                    className="text-[11px] text-emerald-400 hover:underline"
                  >
                    Enable Sensor (iOS)
                  </button>
                )}
              </div>
            </div>

            {/* Slider to simulate rotating your phone */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
              <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                Test Rotate Phone:
              </span>
              <input
                type="range"
                min="0"
                max="360"
                value={effectiveHeading}
                onChange={(e) => onSetManualHeading(Number(e.target.value))}
                className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-xs font-mono text-cyan-300 w-12 text-right font-bold">
                {Math.round(effectiveHeading)}°
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
