import React, { useState } from 'react';
import { PYTHON_RADAR_SCRIPTS, STEP_BY_STEP_TUTORIAL } from '../utils/pythonScripts';
import {
  Code2,
  Terminal,
  BookOpen,
  Copy,
  Check,
  Download,
  Sliders,
  ExternalLink,
  Cpu,
  Radio,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface PythonRadarLabProps {
  initialMac?: string;
  isBridgeConnected: boolean;
  isBridgeConnecting: boolean;
  bridgeError: string | null;
  onConnectBridge: () => void;
  onDisconnectBridge: () => void;
}

export const PythonRadarLab: React.FC<PythonRadarLabProps> = ({
  initialMac,
  isBridgeConnected,
  isBridgeConnecting,
  bridgeError,
  onConnectBridge,
  onDisconnectBridge,
}) => {
  const [activeTab, setActiveTab] = useState<'tutorial' | 'scripts' | 'generator' | 'bridge'>('tutorial');
  const [selectedScriptId, setSelectedScriptId] = useState<string>('radar_gui');
  const [copied, setCopied] = useState<string | null>(null);

  // Generator customized state
  const [customMac, setCustomMac] = useState<string>(initialMac || 'E4:5F:01:2A:3B:4C');
  const [customTxPower, setCustomTxPower] = useState<number>(-59);
  const [customPathLossN, setCustomPathLossN] = useState<number>(2.5);
  const [customMaxRange, setCustomMaxRange] = useState<number>(15);

  const selectedScript = PYTHON_RADAR_SCRIPTS.find((s) => s.id === selectedScriptId) || PYTHON_RADAR_SCRIPTS[0];

  const handleCopyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2500);
  };

  const handleDownloadScript = (filename: string, content: string) => {
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

  // Generate tailored custom script
  const generateCustomScript = () => {
    return `"""
Customized AeroBLE Python Tracker for Target MAC: ${customMac}
Configured TxPower: ${customTxPower} dBm | Path Loss Exponent: ${customPathLossN} | Max Range: ${customMaxRange}m
"""

import asyncio
import math
import sys
from datetime import datetime
from bleak import BleakScanner

TARGET_MAC = "${customMac.toUpperCase()}"
TX_POWER_1M = ${customTxPower}
PATH_LOSS_EXPONENT = ${customPathLossN}

def calculate_distance(rssi: int) -> float:
    if rssi == 0:
        return 999.0
    ratio = (TX_POWER_1M - rssi) / (10 * PATH_LOSS_EXPONENT)
    return round(math.pow(10, ratio), 2)

class BleSignalSmoother:
    def __init__(self, alpha=0.3):
        self.alpha = alpha
        self.val = None
    def update(self, raw):
        if self.val is None:
            self.val = raw
        else:
            self.val = (self.alpha * raw) + ((1.0 - self.alpha) * self.val)
        return self.val

smoother = BleSignalSmoother(alpha=0.3)

async def main():
    print("=" * 65)
    print(f"[*] AeroBLE Custom Radar Tracker Online")
    print(f"[*] TARGET MAC: {TARGET_MAC}")
    print(f"[*] Physics Model: RSSI={TX_POWER_1M} at 1m, n={PATH_LOSS_EXPONENT}")
    print("=" * 65)

    def on_advertisement(device, adv):
        if device.address.upper() == TARGET_MAC.upper() or TARGET_MAC == "ANY":
            raw_rssi = adv.rssi
            smooth_rssi = smoother.update(raw_rssi)
            dist = calculate_distance(int(smooth_rssi))

            # Visual Proximity Geiger Meter
            meter_len = max(1, min(20, int(dist * 2)))
            meter = "▓" * (20 - meter_len) + "░" * meter_len

            status = "IMMEDIATE (HOT!)" if dist < 1.0 else ("NEAR" if dist < 3.0 else "IN RANGE")

            timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
            print(f"[{timestamp}] {device.name or 'Target'} | RSSI: {raw_rssi:3d} dBm | Est. Distance: {dist:4.1f}m [{meter}] -> {status}")

    scanner = BleakScanner(detection_callback=on_advertisement)
    await scanner.start()
    print("[+] Scanner engaged. Move your device closer or farther to test tracking...")

    try:
        while True:
            await asyncio.sleep(1.0)
    except KeyboardInterrupt:
        await scanner.stop()
        print("\\n[-] Tracking stopped.")

if __name__ == "__main__":
    asyncio.run(main())
`;
  };

  return (
    <div className="bg-[#070e1b] border border-emerald-500/30 rounded-2xl p-6 shadow-2xl">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-mono text-xs font-semibold">
              PYTHON BLE RADAR LAB
            </span>
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Powered by Bleak &amp; Asyncio
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            How to Build a Bluetooth Radar in Python
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Step-by-step masterclass, complete copy-pasteable production scripts, and a real-time local bridge that streams live computer Bluetooth hardware right into this web radar.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('tutorial')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === 'tutorial'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Step-by-Step Guide</span>
          </button>

          <button
            onClick={() => setActiveTab('scripts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === 'scripts'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Production Scripts</span>
          </button>

          <button
            onClick={() => setActiveTab('generator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === 'generator'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Script Generator</span>
          </button>

          <button
            onClick={() => setActiveTab('bridge')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === 'bridge'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Hardware Bridge</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Step-by-Step Tutorial */}
      {activeTab === 'tutorial' && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
              <div className="text-xs font-mono text-emerald-400 font-bold mb-1">
                RULE #1: BLE ADVERTISING
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Beacons and gadgets broadcast 31-byte advertising packets 1 to 10 times every second on 2.4 GHz channels 37, 38, &amp; 39.
              </p>
            </div>
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
              <div className="text-xs font-mono text-cyan-400 font-bold mb-1">
                RULE #2: THE DISTANCE FORMULA
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Radio signals follow the inverse-square law. Distance is derived via:
                <span className="block mt-1 font-mono text-emerald-300">
                  d = 10 ^ ((TxPower - RSSI) / (10 * n))
                </span>
              </p>
            </div>
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
              <div className="text-xs font-mono text-amber-400 font-bold mb-1">
                RULE #3: MULTIPATH FILTERING
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Raw RF bounces off walls. You must apply an Exponential Moving Average (EMA) or Kalman filter to avoid erratic jumping.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {STEP_BY_STEP_TUTORIAL.map((item) => (
              <div
                key={item.step}
                className="p-5 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-mono font-bold text-sm flex items-center justify-center shrink-0">
                    {item.step}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-100">{item.title}</h3>
                    <p className="text-xs font-mono text-emerald-400/90 mt-0.5 mb-3">
                      {item.summary}
                    </p>
                    <div className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed bg-slate-950/90 p-4 rounded-lg border border-slate-800/80 overflow-x-auto">
                      {item.content}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Ready-to-Run Scripts */}
      {activeTab === 'scripts' && (
        <div className="mt-6">
          {/* Script Selector Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
            {PYTHON_RADAR_SCRIPTS.map((script) => (
              <button
                key={script.id}
                onClick={() => setSelectedScriptId(script.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedScriptId === script.id
                    ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 text-slate-400'
                }`}
              >
                <div className="text-xs font-bold font-mono text-slate-200 truncate">
                  {script.filename}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {script.description}
                </div>
              </button>
            ))}
          </div>

          {/* Script Details Card */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold font-mono text-emerald-400">
                  {selectedScript.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400 font-mono">
                    Required: {selectedScript.dependencies.join(', ')}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs text-cyan-400 font-mono">
                    pip install {selectedScript.dependencies.join(' ')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyCode(selectedScript.code, selectedScript.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono transition-colors"
                >
                  {copied === selectedScript.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied === selectedScript.id ? 'Copied!' : 'Copy Code'}</span>
                </button>

                <button
                  onClick={() => handleDownloadScript(selectedScript.filename, selectedScript.code)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs font-mono transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .py</span>
                </button>
              </div>
            </div>

            {/* Step instructions */}
            <div className="mt-4 mb-4 p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-lg">
              <span className="text-xs font-bold font-mono text-emerald-400 block mb-1">
                EXECUTION INSTRUCTIONS:
              </span>
              <ul className="text-xs font-mono text-slate-300 space-y-1 list-disc list-inside">
                {selectedScript.instructions.map((inst, i) => (
                  <li key={i}>{inst}</li>
                ))}
              </ul>
            </div>

            {/* Code Block */}
            <div className="relative">
              <pre className="p-4 bg-[#040810] border border-slate-800 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto max-h-[460px] leading-relaxed custom-scrollbar">
                <code>{selectedScript.code}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Customized Script Generator */}
      {activeTab === 'generator' && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Column */}
          <div className="space-y-4 bg-slate-950/90 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400">
              <Sliders className="w-4 h-4" />
              <span>RADAR PARAMETERS</span>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">
                Target Bluetooth MAC Address
              </label>
              <input
                type="text"
                value={customMac}
                onChange={(e) => setCustomMac(e.target.value)}
                placeholder="e.g. 74:F0:7D:68:5A:2B or ANY"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                Type 'ANY' to track all nearby BLE devices.
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>1-Meter Measured Power (TxPower)</span>
                <span className="text-cyan-400">{customTxPower} dBm</span>
              </div>
              <input
                type="range"
                min="-75"
                max="-45"
                value={customTxPower}
                onChange={(e) => setCustomTxPower(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
              <span className="text-[10px] text-slate-500 font-mono block mt-1">
                Standard: -59 dBm for Apple/iBeacon, -65 dBm for low-power beacons.
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Path Loss Exponent (n)</span>
                <span className="text-emerald-400">{customPathLossN}</span>
              </div>
              <input
                type="range"
                min="1.8"
                max="4.0"
                step="0.1"
                value={customPathLossN}
                onChange={(e) => setCustomPathLossN(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <span className="text-[10px] text-slate-500 font-mono block mt-1">
                2.0 = Line of Sight (Outdoors) | 2.5 - 3.2 = Office/Drywall | 4.0 = Metal
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Max Radar Range</span>
                <span className="text-amber-400">{customMaxRange}m</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={customMaxRange}
                onChange={(e) => setCustomMaxRange(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div className="pt-2">
              <button
                onClick={() => handleDownloadScript(`ble_custom_${customMac.replace(/:/g, '')}.py`, generateCustomScript())}
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Generated Script</span>
              </button>
            </div>
          </div>

          {/* Generated Code Preview Column */}
          <div className="lg:col-span-2 bg-slate-950/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <span className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>tailored_ble_tracker.py</span>
                </span>
                <button
                  onClick={() => handleCopyCode(generateCustomScript(), 'custom_code')}
                  className="flex items-center gap-1 text-xs font-mono text-emerald-400 hover:text-emerald-300"
                >
                  {copied === 'custom_code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied === 'custom_code' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              <pre className="p-4 bg-[#040810] border border-slate-800/80 rounded-lg text-xs font-mono text-cyan-300 overflow-x-auto max-h-[380px] leading-relaxed custom-scrollbar">
                <code>{generateCustomScript()}</code>
              </pre>
            </div>

            <div className="mt-3 p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-lg flex items-center justify-between text-xs font-mono text-slate-300">
              <span>Run command in your terminal:</span>
              <code className="text-cyan-400 bg-slate-900 px-2 py-0.5 rounded">
                python tailored_ble_tracker.py
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Hardware WebSocket Bridge */}
      {activeTab === 'bridge' && (
        <div className="mt-6 space-y-6">
          <div className="p-5 bg-slate-950/90 border border-slate-800 rounded-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-3 h-3 rounded-full ${isBridgeConnected ? 'bg-emerald-500 animate-ping' : 'bg-slate-600'}`} />
                  <span className="text-sm font-bold font-mono text-slate-200">
                    BRIDGE STATUS: {isBridgeConnected ? 'CONNECTED TO LOCAL PYTHON RADAR' : isBridgeConnecting ? 'CONNECTING TO WS://LOCALHOST:8765...' : 'DISCONNECTED (STANDBY)'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                  The Python Bridge allows this web radar to tap directly into your physical computer's Bluetooth radio! When active, every real device in your room will show on the radar screen.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isBridgeConnected ? (
                  <button
                    onClick={onDisconnectBridge}
                    className="px-4 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold transition-all"
                  >
                    Disconnect Bridge
                  </button>
                ) : (
                  <button
                    onClick={onConnectBridge}
                    disabled={isBridgeConnecting}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
                  >
                    {isBridgeConnecting ? 'Probing Port 8765...' : 'Connect Python Bridge'}
                  </button>
                )}
              </div>
            </div>

            {bridgeError && (
              <div className="mt-4 p-3 bg-rose-950/40 border border-rose-500/30 rounded-lg text-xs font-mono text-rose-300">
                {bridgeError}
              </div>
            )}
          </div>

          {/* Setup Guide for Bridge */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
              <h4 className="text-xs font-bold font-mono text-emerald-400 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>STEP 1: INSTALL PYTHON LIBS</span>
              </h4>
              <p className="text-xs text-slate-400 mb-2">
                Run this in your terminal or command prompt:
              </p>
              <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-emerald-300">
                <code>pip install bleak websockets</code>
                <button
                  onClick={() => handleCopyCode('pip install bleak websockets', 'pip_bridge')}
                  className="text-slate-400 hover:text-emerald-400"
                >
                  {copied === 'pip_bridge' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
              <h4 className="text-xs font-bold font-mono text-cyan-400 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>STEP 2: RUN THE BRIDGE SERVER</span>
              </h4>
              <p className="text-xs text-slate-400 mb-2">
                Save Script #3 as <code className="text-cyan-300">ble_bridge_server.py</code> and execute:
              </p>
              <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-cyan-300">
                <code>python ble_bridge_server.py</code>
                <button
                  onClick={() => handleCopyCode('python ble_bridge_server.py', 'run_bridge')}
                  className="text-slate-400 hover:text-cyan-400"
                >
                  {copied === 'run_bridge' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
