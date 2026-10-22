import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TrackedBleDevice, RadarConfig, BlePacketLog } from './types/bluetooth';
import { calculateBleDistance } from './utils/bleCalculations';
import { Header } from './components/Header';
import { RadarCanvas } from './components/RadarCanvas';
import { NavigationCompass } from './components/NavigationCompass';
import { DeviceTracker } from './components/DeviceTracker';
import { DeviceList } from './components/DeviceList';
import { PythonRadarLab } from './components/PythonRadarLab';
import { CalibrationModal } from './components/CalibrationModal';
import { PacketLog } from './components/PacketLog';
import { PhoneNameResolverModal } from './components/PhoneNameResolverModal';
import { PhoneVisibilityGuide } from './components/PhoneVisibilityGuide';
import { DownloadHubModal } from './components/DownloadHubModal';
import { useWebBluetooth } from './hooks/useWebBluetooth';
import { usePythonBridge } from './hooks/usePythonBridge';
import { useDeviceOrientation } from './hooks/useDeviceOrientation';
import { Monitor, Smartphone, Navigation, Radio, Bluetooth, HelpCircle, Download } from 'lucide-react';

export default function App() {
  // STRICTLY REAL DEVICES ONLY - No simulated or mock devices!
  const [devices, setDevices] = useState<TrackedBleDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<TrackedBleDevice | null>(null);
  const [packetLogs, setPacketLogs] = useState<BlePacketLog[]>([]);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [targetMacForPython, setTargetMacForPython] = useState<string>('DESKTOP');

  const pythonLabRef = useRef<HTMLDivElement | null>(null);

  // Radar Config State
  const [config, setConfig] = useState<RadarConfig>({
    maxRangeMeters: 10,
    sweepSpeedRpm: 30,
    soundEnabled: true,
    showTrails: true,
    showDegrees: true,
    showGrid: true,
    filterMinRssi: -98,
    pathLossExponent: 2.5,
    referenceTxPower: -59,
  });

  // Device Orientation Hook (for phone movement and direction tracking)
  const {
    orientation,
    effectiveHeading,
    manualHeading,
    setManualHeading,
    targetLaptopBearing,
    isCalibrated,
    invertedCompass,
    setInvertedCompass,
    aimAtLaptop,
    setLaptopBearingDirectly,
    nudgeLaptopBearing,
    requestCompassPermission,
    getGuidanceToTarget,
  } = useDeviceOrientation();

  // Log incoming real packets
  const addPacketLog = useCallback((mac: string, name: string, rssi: number, distance: number) => {
    const newLog: BlePacketLog = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      mac,
      name,
      rssi,
      distance,
      type: 'REAL_BLE_ADV',
    };
    setPacketLogs((prev) => [newLog, ...prev.slice(0, 199)]);
  }, []);

  // Web Bluetooth Hook
  const {
    isSupported: isWebBleSupported,
    isConnecting: isWebBleConnecting,
    error: webBleError,
    pendingUnresolvedDevice,
    resolveDeviceName,
    dismissPendingDevice,
    requestAndConnectDevice,
  } = useWebBluetooth();

  const handleConnectWebBle = () => {
    requestAndConnectDevice((newDev) => {
      setDevices((prev) => {
        const existing = prev.filter((d) => d.id !== newDev.id);
        return [newDev, ...existing];
      });
      setSelectedDevice(newDev);
      setTargetMacForPython(newDev.id);
      addPacketLog(newDev.id, newDev.name, newDev.rssi, newDev.distanceMeters);
    });
  };

  // Python WebSocket Bridge Hook
  const handleBridgeDeviceUpdate = useCallback((bridgeDev: TrackedBleDevice) => {
    setDevices((prev) => {
      const idx = prev.findIndex((d) => d.id === bridgeDev.id);
      if (idx !== -1) {
        const existing = prev[idx];
        const newHistory = [
          ...(existing.rssiHistory || []),
          { timestamp: Date.now(), rssi: bridgeDev.rssi },
        ].slice(-30);

        const updated = {
          ...existing,
          rssi: bridgeDev.rssi,
          distanceMeters: calculateBleDistance(
            bridgeDev.rssi,
            config.referenceTxPower,
            config.pathLossExponent
          ),
          lastSeen: Date.now(),
          rssiHistory: newHistory,
        };

        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      } else {
        return [bridgeDev, ...prev];
      }
    });

    addPacketLog(
      bridgeDev.id,
      bridgeDev.name,
      bridgeDev.rssi,
      bridgeDev.distanceMeters
    );
  }, [config.referenceTxPower, config.pathLossExponent, addPacketLog]);

  const {
    isConnected: isBridgeConnected,
    isConnecting: isBridgeConnecting,
    lastError: bridgeError,
    connectBridge,
    disconnectBridge,
  } = usePythonBridge(handleBridgeDeviceUpdate);

  // Auto-select first real device if none selected
  useEffect(() => {
    if (!selectedDevice && devices.length > 0) {
      setSelectedDevice(devices[0]);
    } else if (selectedDevice) {
      const current = devices.find((d) => d.id === selectedDevice.id);
      if (current) setSelectedDevice(current);
    }
  }, [devices, selectedDevice]);

  // Compute live wayfinding guidance to target desktop/laptop
  const wayfindingGuidance = selectedDevice
    ? getGuidanceToTarget(selectedDevice.angleDegrees, selectedDevice.distanceMeters)
    : {
        relativeAngle: 0,
        instruction: 'Select a target desktop or laptop to start navigation',
        stepsEstimate: 0,
        isFacingTarget: false,
      };

  const handleRenameDevice = (deviceId: string, newName: string) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === deviceId ? { ...d, name: newName } : d))
    );
    if (selectedDevice?.id === deviceId) {
      setSelectedDevice((prev) => (prev ? { ...prev, name: newName } : null));
    }
  };

  const handleScrollToPython = (mac?: string) => {
    if (mac) setTargetMacForPython(mac);
    pythonLabRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#030711] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Cockpit Header */}
      <Header
        config={config}
        onUpdateConfig={(partial) => setConfig((prev) => ({ ...prev, ...partial }))}
        onOpenCalibration={() => setIsCalibrationOpen(true)}
        onConnectWebBle={handleConnectWebBle}
        isWebBleConnecting={isWebBleConnecting}
        webBleSupported={isWebBleSupported}
        webBleError={webBleError}
        isBridgeConnected={isBridgeConnected}
        onScrollToPythonLab={() => handleScrollToPython()}
        onOpenDownloadModal={() => setIsDownloadOpen(true)}
      />

      {/* Main Tactical Grid View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-6">
        {/* Real Hardware Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-cyan-950/60 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <Bluetooth className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-200">REAL HARDWARE TRACKING MODE</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-300 text-[10px]">
                  ACTIVE
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-slate-400">
                  Connect and track any real phone, computer, or Bluetooth gadget with live compass wayfinding.
                </span>
                <button
                  type="button"
                  onClick={() => setIsGuideOpen(true)}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 underline font-semibold"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Make phone names show up</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleConnectWebBle}
              disabled={isWebBleConnecting}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow"
            >
              <Bluetooth className="w-3.5 h-3.5" />
              <span>{isWebBleConnecting ? 'Scanning...' : 'Connect Bluetooth Device'}</span>
            </button>
            <button
              onClick={() => handleScrollToPython()}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 text-xs flex items-center gap-1.5"
            >
              <span>Python Bridge</span>
            </button>
          </div>
        </div>

        {/* Dynamic Wayfinding & Phone Pointer Compass */}
        {selectedDevice && (
          <NavigationCompass
            device={selectedDevice}
            orientation={orientation}
            guidance={wayfindingGuidance}
            effectiveHeading={effectiveHeading}
            manualHeading={manualHeading}
            targetLaptopBearing={targetLaptopBearing}
            isCalibrated={isCalibrated}
            invertedCompass={invertedCompass}
            onSetManualHeading={setManualHeading}
            onAimAtLaptop={aimAtLaptop}
            onSetLaptopBearingDirectly={setLaptopBearingDirectly}
            onNudgeBearing={nudgeLaptopBearing}
            onToggleInvertedCompass={() => setInvertedCompass(!invertedCompass)}
            onRequestPermission={requestCompassPermission}
          />
        )}

        {/* Top Split Section: Radar Canvas + Target Tracker + Real Devices Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Radar Screen (7 cols on lg) */}
          <div className="lg:col-span-7 flex flex-col">
            <RadarCanvas
              devices={devices}
              config={config}
              selectedDevice={selectedDevice}
              phoneHeading={effectiveHeading}
              targetLaptopBearing={targetLaptopBearing}
              onSelectDevice={(dev) => {
                setSelectedDevice(dev);
                setTargetMacForPython(dev.id);
              }}
              onUpdateConfig={(partial) => setConfig((prev) => ({ ...prev, ...partial }))}
              onConnectWebBle={handleConnectWebBle}
              isWebBleConnecting={isWebBleConnecting}
            />
          </div>

          {/* Right Column: Target Tracker (top) & Real Devices List (5 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <DeviceTracker
              device={selectedDevice}
              onClearTarget={() => setSelectedDevice(null)}
              onOpenPythonScriptForDevice={(mac) => handleScrollToPython(mac)}
              soundEnabled={config.soundEnabled}
              onRenameDevice={handleRenameDevice}
            />

            <DeviceList
              devices={devices}
              selectedDevice={selectedDevice}
              onSelectDevice={(dev) => {
                setSelectedDevice(dev);
                setTargetMacForPython(dev.id);
              }}
              onConnectWebBle={handleConnectWebBle}
              isWebBleConnecting={isWebBleConnecting}
              onScrollToPython={() => handleScrollToPython()}
              onRenameDevice={handleRenameDevice}
            />
          </div>
        </div>

        {/* Python Engineering Suite & Step-by-Step Guide */}
        <div ref={pythonLabRef} className="pt-2">
          <PythonRadarLab
            initialMac={targetMacForPython}
            isBridgeConnected={isBridgeConnected}
            isBridgeConnecting={isBridgeConnecting}
            bridgeError={bridgeError}
            onConnectBridge={connectBridge}
            onDisconnectBridge={disconnectBridge}
          />
        </div>

        {/* Live Packet Sniffer & Telemetry Log */}
        <div>
          <PacketLog
            logs={packetLogs}
            onClearLogs={() => setPacketLogs([])}
          />
        </div>
      </main>

      {/* RF Physics & Distance Calibration Modal */}
      <CalibrationModal
        config={config}
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        onSave={(partial) => setConfig((prev) => ({ ...prev, ...partial }))}
      />

      {/* Phone Name Resolver Modal */}
      {pendingUnresolvedDevice && (
        <PhoneNameResolverModal
          device={pendingUnresolvedDevice}
          onConfirmName={(id, name) => {
            resolveDeviceName(id, name);
            handleRenameDevice(id, name);
          }}
          onDismiss={dismissPendingDevice}
        />
      )}

      {/* Phone Visibility Guide Modal */}
      <PhoneVisibilityGuide
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Download & Installation Hub Modal */}
      <DownloadHubModal
        isOpen={isDownloadOpen}
        onClose={() => setIsDownloadOpen(false)}
        onOpenPythonLab={() => handleScrollToPython()}
      />
    </div>
  );
}
