import React, { useRef, useEffect, useState, useCallback } from 'react';
import { TrackedBleDevice, RadarConfig } from '../types/bluetooth';
import { polarToCartesian, getSignalQuality } from '../utils/bleCalculations';
import { radarAudio } from '../utils/audio';
import { Crosshair, Radio, Shield, ZoomIn, ZoomOut, Volume2, VolumeX } from 'lucide-react';

interface RadarCanvasProps {
  devices: TrackedBleDevice[];
  config: RadarConfig;
  selectedDevice: TrackedBleDevice | null;
  phoneHeading?: number;
  targetLaptopBearing?: number;
  onSelectDevice: (device: TrackedBleDevice) => void;
  onUpdateConfig: (partial: Partial<RadarConfig>) => void;
  onConnectWebBle: () => void;
  isWebBleConnecting: boolean;
}

export const RadarCanvas: React.FC<RadarCanvasProps> = ({
  devices,
  config,
  selectedDevice,
  phoneHeading = 0,
  targetLaptopBearing,
  onSelectDevice,
  onUpdateConfig,
  onConnectWebBle,
  isWebBleConnecting,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const sweepAngleRef = useRef<number>(0);
  const lastBlipTimeRef = useRef<{ [key: string]: number }>({});
  const [hoveredDev, setHoveredDev] = useState<TrackedBleDevice | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Range options
  const rangeOptions = [5, 10, 20, 50];

  const handleNextRange = useCallback(() => {
    const currentIndex = rangeOptions.indexOf(config.maxRangeMeters);
    const nextIndex = (currentIndex + 1) % rangeOptions.length;
    onUpdateConfig({ maxRangeMeters: rangeOptions[nextIndex] });
  }, [config.maxRangeMeters, onUpdateConfig]);

  const handlePrevRange = useCallback(() => {
    const currentIndex = rangeOptions.indexOf(config.maxRangeMeters);
    const prevIndex = (currentIndex - 1 + rangeOptions.length) % rangeOptions.length;
    onUpdateConfig({ maxRangeMeters: rangeOptions[prevIndex] });
  }, [config.maxRangeMeters, onUpdateConfig]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTimestamp = performance.now();

    const render = (now: number) => {
      const dt = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      // Update sweep angle: RPM to degrees per second
      const degPerSec = (config.sweepSpeedRpm / 60) * 360;
      const prevAngle = sweepAngleRef.current;
      sweepAngleRef.current = (sweepAngleRef.current + degPerSec * dt) % 360;
      const currentAngle = sweepAngleRef.current;

      // Handle canvas resolution
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = rect.height;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(cx, cy) - 24;

      // 1. Background Fill with subtle radial cockpit glow
      ctx.fillStyle = '#050a12';
      ctx.fillRect(0, 0, width, height);

      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius);
      grad.addColorStop(0, '#06161c');
      grad.addColorStop(0.7, '#041017');
      grad.addColorStop(1, '#02070c');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Concentric Range Rings
      const ringCount = 5;
      for (let i = 1; i <= ringCount; i++) {
        const ringRadius = (radius / ringCount) * i;
        const ringDist = (config.maxRangeMeters / ringCount) * i;

        ctx.strokeStyle = i === ringCount ? 'rgba(16, 185, 129, 0.45)' : 'rgba(6, 78, 59, 0.4)';
        ctx.lineWidth = i === ringCount ? 2 : 1;
        ctx.setLineDash(i === ringCount ? [] : [3, 4]);

        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ring distance label
        ctx.fillStyle = 'rgba(52, 211, 153, 0.65)';
        ctx.font = '10px monospace';
        ctx.fillText(`${ringDist}m`, cx + 4, cy - ringRadius + 12);
      }

      // 3. Radial Spokes & Degree Notches
      if (config.showGrid) {
        ctx.strokeStyle = 'rgba(6, 78, 59, 0.35)';
        ctx.lineWidth = 1;
        // 12 spokes (every 30 degrees)
        for (let deg = 0; deg < 360; deg += 30) {
          const rad = ((deg - 90) * Math.PI) / 180;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + radius * Math.cos(rad), cy + radius * Math.sin(rad));
          ctx.stroke();
        }
      }

      // 4. Azimuth Cardinal Marks
      if (config.showDegrees) {
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const cardinals = [
          { text: '000° N', x: cx, y: cy - radius - 12, color: '#34d399' },
          { text: '090° E', x: cx + radius + 18, y: cy, color: '#06b6d4' },
          { text: '180° S', x: cx, y: cy + radius + 12, color: '#34d399' },
          { text: '270° W', x: cx - radius - 18, y: cy, color: '#06b6d4' },
        ];

        cardinals.forEach((c) => {
          ctx.fillStyle = c.color;
          ctx.fillText(c.text, c.x, c.y);
        });
      }

      // 5. Radar Phosphor Sweep Fan Gradient
      if (config.showTrails) {
        const sweepRad = ((currentAngle - 90) * Math.PI) / 180;
        const trailArc = (45 * Math.PI) / 180; // 45 degree phosphor trail
        const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        sweepGrad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
        sweepGrad.addColorStop(1, 'rgba(16, 185, 129, 0.05)');

        ctx.fillStyle = sweepGrad;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, sweepRad - trailArc, sweepRad, false);
        ctx.closePath();
        ctx.fill();
      }

      // Sweep Beam Line
      const sweepRad = ((currentAngle - 90) * Math.PI) / 180;
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + radius * Math.cos(sweepRad), cy + radius * Math.sin(sweepRad));
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // Center Observer Icon
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();

      // 6. Device Blips
      devices.forEach((dev) => {
        // Filter by min RSSI
        if (dev.rssi < config.filterMinRssi) return;

        const isLocked = selectedDevice?.id === dev.id;
        const effectiveAngle = isLocked && targetLaptopBearing !== undefined
          ? targetLaptopBearing
          : dev.angleDegrees;

        const { x: normX, y: normY } = polarToCartesian(
          dev.distanceMeters,
          effectiveAngle,
          config.maxRangeMeters
        );

        const bx = cx + normX * radius;
        const by = cy + normY * radius;

        // Draw dotted vector line from observer center to locked laptop
        if (isLocked) {
          ctx.save();
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(bx, by);
          ctx.stroke();
          ctx.restore();
        }

        // Check if sweep beam is currently passing over this device
        const devAngle = (effectiveAngle % 360 + 360) % 360;
        let angleDiff = Math.abs(currentAngle - devAngle);
        if (angleDiff > 180) angleDiff = 360 - angleDiff;

        const isHitByBeam = angleDiff < 8;
        if (isHitByBeam) {
          const lastHit = lastBlipTimeRef.current[dev.id] || 0;
          if (now - lastHit > 1200) {
            lastBlipTimeRef.current[dev.id] = now;
            if (config.soundEnabled) {
              const pitch = dev.isTargetLocked ? 1.4 : 1.0;
              radarAudio.playBlip(pitch);
            }
          }
        }

        const isHovered = hoveredDev?.id === dev.id;
        const quality = getSignalQuality(dev.rssi);

        // Blip Glow
        ctx.save();
        if (isLocked) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.arc(bx, by, 14, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Lock brackets
          const bracketLen = 6;
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          // Top Left
          ctx.beginPath();
          ctx.moveTo(bx - 16, by - 10);
          ctx.lineTo(bx - 16, by - 16);
          ctx.lineTo(bx - 10, by - 16);
          ctx.stroke();
          // Top Right
          ctx.beginPath();
          ctx.moveTo(bx + 16, by - 10);
          ctx.lineTo(bx + 16, by - 16);
          ctx.lineTo(bx + 10, by - 16);
          ctx.stroke();
          // Bottom Left
          ctx.beginPath();
          ctx.moveTo(bx - 16, by + 10);
          ctx.lineTo(bx - 16, by + 16);
          ctx.lineTo(bx - 10, by + 16);
          ctx.stroke();
          // Bottom Right
          ctx.beginPath();
          ctx.moveTo(bx + 16, by + 10);
          ctx.lineTo(bx + 16, by + 16);
          ctx.lineTo(bx + 10, by + 16);
          ctx.stroke();
        }

        // Pulse ring
        if (isHitByBeam || isLocked) {
          ctx.strokeStyle = isLocked ? 'rgba(245, 158, 11, 0.7)' : 'rgba(52, 211, 153, 0.7)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(bx, by, isLocked ? 18 : 12, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Core blip dot
        ctx.fillStyle = isLocked ? '#f59e0b' : isHovered ? '#38bdf8' : quality.color;
        ctx.shadowColor = isLocked ? '#f59e0b' : quality.color;
        ctx.shadowBlur = isLocked || isHitByBeam ? 12 : 5;
        ctx.beginPath();
        ctx.arc(bx, by, isLocked ? 6 : isHovered ? 5.5 : 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label above blip
        ctx.fillStyle = isLocked ? '#fde68a' : '#e2e8f0';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(dev.name.length > 14 ? dev.name.slice(0, 12) + '..' : dev.name, bx, by - 10);

        // Distance text below
        ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
        ctx.font = '9px monospace';
        ctx.fillText(`${dev.distanceMeters.toFixed(1)}m`, bx, by + 15);

        ctx.restore();
      });

      // 7. Outer Ring Bezel
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [devices, config, selectedDevice, hoveredDev, onSelectDevice]);

  // Handle Mouse Hover & Click detection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setMousePos({ x: e.clientX, y: e.clientY });

    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const radius = Math.min(cx, cy) - 24;

    let found: TrackedBleDevice | null = null;
    for (const dev of devices) {
      const { x: normX, y: normY } = polarToCartesian(
        dev.distanceMeters,
        dev.angleDegrees,
        config.maxRangeMeters
      );
      const bx = cx + normX * radius;
      const by = cy + normY * radius;
      const dist = Math.hypot(mx - bx, my - by);

      if (dist <= 16) {
        found = dev;
        break;
      }
    }
    setHoveredDev(found);
  };

  const handleMouseClick = () => {
    if (hoveredDev) {
      onSelectDevice(hoveredDev);
      radarAudio.playTargetLocked();
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center bg-[#070d18] border border-emerald-950/80 rounded-2xl p-4 shadow-2xl overflow-hidden">
      {/* Top HUD Controls */}
      <div className="w-full flex items-center justify-between px-2 mb-3 z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/50 border border-emerald-500/30 rounded-lg text-emerald-400 font-mono text-xs">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>SWEEP: {config.sweepSpeedRpm} RPM</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-950/40 border border-cyan-500/30 rounded-lg text-cyan-400 font-mono text-xs">
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span>RANGE: {config.maxRangeMeters}M</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/60 border border-slate-700/50 rounded-lg text-slate-300 font-mono text-xs">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>TARGETS: {devices.length}</span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const muted = !config.soundEnabled;
              onUpdateConfig({ soundEnabled: !muted });
              radarAudio.setMuted(muted);
              if (!muted) radarAudio.playSonarPing();
            }}
            className={`p-1.5 rounded-lg border text-xs font-mono flex items-center gap-1 transition-all ${
              config.soundEnabled
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title={config.soundEnabled ? 'Mute Radar Audio' : 'Enable Sonar Pings'}
          >
            {config.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{config.soundEnabled ? 'AUDIO ON' : 'MUTED'}</span>
          </button>

          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={handlePrevRange}
              className="p-1 hover:text-emerald-400 text-slate-400 transition-colors"
              title="Zoom In (Decrease Range)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 text-[11px] font-mono text-emerald-400 font-semibold">
              {config.maxRangeMeters}m
            </span>
            <button
              onClick={handleNextRange}
              className="p-1 hover:text-emerald-400 text-slate-400 transition-colors"
              title="Zoom Out (Increase Range)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Radar Canvas Container */}
      <div className="relative w-full aspect-square max-w-[580px] max-h-[580px] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredDev(null)}
          onClick={handleMouseClick}
          className="w-full h-full cursor-crosshair rounded-full border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.12)]"
        />

        {/* Empty State Overlay when no real hardware is paired yet */}
        {devices.length === 0 && (
          <div className="absolute inset-4 rounded-full flex flex-col items-center justify-center bg-[#050a12]/85 backdrop-blur-md p-6 text-center z-20 border border-emerald-500/20">
            <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Radio className="w-7 h-7 animate-pulse text-emerald-400" />
            </div>
            <h4 className="text-sm font-bold font-mono text-emerald-300 tracking-wider">
              AWAITING REAL HARDWARE DEVICE
            </h4>
            <p className="text-xs text-slate-400 max-w-xs mt-1.5 leading-relaxed font-mono">
              Connect your physical Bluetooth device (phone, laptop, tablet, beacon) to track it live.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row items-center gap-2">
              <button
                onClick={onConnectWebBle}
                disabled={isWebBleConnecting}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>{isWebBleConnecting ? 'Scanning BLE...' : 'Connect Bluetooth Device'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Hovered Device Tooltip */}
        {hoveredDev && mousePos && (
          <div
            className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full mb-3 bg-[#0a1526]/95 backdrop-blur-md border border-cyan-500/50 rounded-lg p-2.5 shadow-2xl text-xs font-mono text-slate-200"
            style={{ left: mousePos.x, top: mousePos.y - 12 }}
          >
            <div className="flex items-center justify-between gap-3 font-bold text-cyan-300">
              <span>{hoveredDev.name}</span>
              <span className="text-[10px] text-emerald-400">{hoveredDev.rssi} dBm</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex gap-3">
              <span>Dist: {hoveredDev.distanceMeters.toFixed(1)}m</span>
              <span>Bearing: {hoveredDev.angleDegrees}°</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[180px]">
              {hoveredDev.id}
            </div>
            <div className="mt-1 text-[10px] text-amber-400 italic">Click to Lock Target</div>
          </div>
        )}
      </div>

      {/* Bottom HUD Legend */}
      <div className="w-full mt-3 flex items-center justify-between text-[11px] font-mono text-slate-400 px-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <span>&gt;-50 dBm (Close)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            <span>-65 dBm</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>-80 dBm</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>-95 dBm (Fringe)</span>
          </span>
        </div>

        <div className="text-slate-500">
          Click blip to engage Proximity Finder
        </div>
      </div>
    </div>
  );
};
