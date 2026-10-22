import React, { useRef, useEffect } from 'react';
import { RadarConfig } from '../types/bluetooth';
import { calculateBleDistance } from '../utils/bleCalculations';
import { Sliders, X, Check, RotateCcw, Info } from 'lucide-react';

interface CalibrationModalProps {
  config: RadarConfig;
  isOpen: boolean;
  onClose: () => void;
  onSave: (partial: Partial<RadarConfig>) => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  config,
  isOpen,
  onClose,
  onSave,
}) => {
  const [txPower, setTxPower] = React.useState(config.referenceTxPower);
  const [pathLossN, setPathLossN] = React.useState(config.pathLossExponent);
  const curveCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setTxPower(config.referenceTxPower);
    setPathLossN(config.pathLossExponent);
  }, [config, isOpen]);

  // Draw dynamic physics curve (RSSI dBm vs Distance in meters)
  useEffect(() => {
    if (!isOpen) return;
    const canvas = curveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Axes
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(35, 10);
    ctx.lineTo(35, height - 25);
    ctx.lineTo(width - 10, height - 25);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.fillText('0m', 35, height - 12);
    ctx.fillText('5m', 100, height - 12);
    ctx.fillText('10m', 170, height - 12);
    ctx.fillText('20m', width - 25, height - 12);

    ctx.fillText('-40dB', 2, 20);
    ctx.fillText('-70dB', 2, height / 2);
    ctx.fillText('-95dB', 2, height - 30);

    // Curve
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const maxDist = 20;
    for (let x = 35; x < width - 10; x++) {
      const dist = ((x - 35) / (width - 45)) * maxDist;
      if (dist <= 0.1) continue;

      // Inverse formula: RSSI = -10 * n * log10(d) + TxPower
      const rssi = -10 * pathLossN * Math.log10(dist) + txPower;
      const normalizedY = (rssi - (-95)) / (-40 - (-95));
      const y = height - 25 - normalizedY * (height - 35);

      if (x === 36) ctx.moveTo(x, Math.max(10, Math.min(height - 25, y)));
      else ctx.lineTo(x, Math.max(10, Math.min(height - 25, y)));
    }
    ctx.stroke();
  }, [txPower, pathLossN, isOpen]);

  if (!isOpen) return null;

  const handleApplyPreset = (presetN: number) => {
    setPathLossN(presetN);
  };

  const handleSave = () => {
    onSave({
      referenceTxPower: txPower,
      pathLossExponent: pathLossN,
    });
    onClose();
  };

  const handleReset = () => {
    setTxPower(-59);
    setPathLossN(2.5);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#070e1b] border border-emerald-500/40 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold font-mono text-slate-100">
              RF SIGNAL &amp; DISTANCE CALIBRATION
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Environment Presets */}
          <div>
            <span className="block text-xs font-mono text-slate-300 mb-2">
              ENVIRONMENT PRESETS (PATH LOSS EXPONENT n):
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset(2.0)}
                className={`p-2 rounded-lg border text-left text-xs font-mono transition-all ${
                  pathLossN === 2.0
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold">Free Space (n=2.0)</div>
                <div className="text-[10px] text-slate-500">Open outdoors, direct sight</div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset(2.8)}
                className={`p-2 rounded-lg border text-left text-xs font-mono transition-all ${
                  pathLossN === 2.8
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold">Office / Drywall (n=2.8)</div>
                <div className="text-[10px] text-slate-500">Light interior walls</div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset(3.3)}
                className={`p-2 rounded-lg border text-left text-xs font-mono transition-all ${
                  pathLossN === 3.3
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold">Dense Home (n=3.3)</div>
                <div className="text-[10px] text-slate-500">Brick, furniture, appliances</div>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset(4.0)}
                className={`p-2 rounded-lg border text-left text-xs font-mono transition-all ${
                  pathLossN === 4.0
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold">Industrial / Metal (n=4.0)</div>
                <div className="text-[10px] text-slate-500">Severe reflection attenuation</div>
              </button>
            </div>
          </div>

          {/* Sliders */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>1-Meter Measured Power (TxPower)</span>
                <span className="text-emerald-400 font-bold">{txPower} dBm</span>
              </div>
              <input
                type="range"
                min="-75"
                max="-45"
                value={txPower}
                onChange={(e) => setTxPower(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Custom Path Loss Exponent (n)</span>
                <span className="text-cyan-400 font-bold">{pathLossN.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1.8"
                max="4.5"
                step="0.1"
                value={pathLossN}
                onChange={(e) => setPathLossN(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>

          {/* Real-time Math Curve */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
            <div className="text-xs font-mono text-slate-400 mb-1 flex items-center justify-between">
              <span>CALIBRATED RF DECAY CURVE</span>
              <span className="text-emerald-400 font-mono text-[10px]">
                d = 10 ^ (({txPower} - RSSI) / {10 * pathLossN})
              </span>
            </div>
            <canvas
              ref={curveCanvasRef}
              width={420}
              height={100}
              className="w-full h-24 rounded bg-slate-900"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-mono"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 shadow"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Calibration</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
