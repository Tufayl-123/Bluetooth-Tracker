import React, { useState } from 'react';
import { TrackedBleDevice } from '../types/bluetooth';
import { getSignalQuality, formatDistance } from '../utils/bleCalculations';
import {
  Search,
  Target,
  Bluetooth,
  Headphones,
  Watch,
  Smartphone,
  Radio,
  Signal,
  Laptop,
  Monitor,
  Cpu,
  Navigation,
  Edit2,
  Check
} from 'lucide-react';

interface DeviceListProps {
  devices: TrackedBleDevice[];
  selectedDevice: TrackedBleDevice | null;
  onSelectDevice: (device: TrackedBleDevice) => void;
  onConnectWebBle: () => void;
  isWebBleConnecting: boolean;
  onScrollToPython: () => void;
  onRenameDevice?: (id: string, newName: string) => void;
}

export const DeviceList: React.FC<DeviceListProps> = ({
  devices,
  selectedDevice,
  onSelectDevice,
  onConnectWebBle,
  isWebBleConnecting,
  onScrollToPython,
  onRenameDevice,
}) => {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const getDeviceIcon = (category: string) => {
    switch (category) {
      case 'desktop':
        return <Monitor className="w-4 h-4 text-emerald-400" />;
      case 'laptop':
        return <Laptop className="w-4 h-4 text-cyan-400" />;
      case 'computer':
        return <Cpu className="w-4 h-4 text-emerald-400" />;
      case 'audio':
        return <Headphones className="w-4 h-4 text-cyan-400" />;
      case 'wearable':
        return <Watch className="w-4 h-4 text-emerald-400" />;
      case 'phone':
        return <Smartphone className="w-4 h-4 text-purple-400" />;
      default:
        return <Radio className="w-4 h-4 text-slate-400" />;
    }
  };

  const handleStartRename = (dev: TrackedBleDevice) => {
    setEditingId(dev.id);
    setEditName(dev.name);
  };

  const handleSaveRename = (id: string) => {
    if (editName.trim() && onRenameDevice) {
      onRenameDevice(id, editName.trim());
    }
    setEditingId(null);
  };

  const filteredDevices = devices.filter((dev) => {
    return (
      dev.name.toLowerCase().includes(search.toLowerCase()) ||
      dev.id.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="bg-[#08111f] border border-slate-800 rounded-2xl p-4 flex flex-col h-full min-h-[380px]">
      {/* Title & Connect Real Device */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bluetooth className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold font-mono tracking-wider text-slate-200">
            PAIRED BLUETOOTH DEVICES ({devices.length})
          </h3>
        </div>

        <button
          onClick={onConnectWebBle}
          disabled={isWebBleConnecting}
          className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold font-mono text-xs rounded-lg transition-colors shadow"
        >
          <Bluetooth className="w-3.5 h-3.5" />
          <span>{isWebBleConnecting ? 'Scanning...' : 'Connect Bluetooth Device'}</span>
        </button>
      </div>

      {/* Search Bar */}
      {devices.length > 0 && (
        <div className="relative mb-3">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Filter devices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      )}

      {/* Devices List Scrollable */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {devices.length === 0 ? (
          <div className="p-6 text-center flex flex-col items-center justify-center h-full min-h-[220px]">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
              <Bluetooth className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold font-mono text-slate-300">
              No Bluetooth Devices Connected
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-[260px] leading-relaxed font-mono">
              Use standard Bluetooth pairing to connect and track any phone, laptop, or gadget.
            </p>
            <div className="mt-4 flex flex-col gap-2 w-full max-w-[240px]">
              <button
                onClick={onConnectWebBle}
                disabled={isWebBleConnecting}
                className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition-all shadow"
              >
                <Bluetooth className="w-4 h-4" />
                <span>Connect Bluetooth Device</span>
              </button>
              <button
                onClick={onScrollToPython}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 text-xs font-mono flex items-center justify-center gap-1.5 transition-all"
              >
                <Cpu className="w-4 h-4" />
                <span>Python Hardware Bridge</span>
              </button>
            </div>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500 font-mono">
            No devices match your search.
          </div>
        ) : (
          filteredDevices.map((dev) => {
            const isSelected = selectedDevice?.id === dev.id;
            const quality = getSignalQuality(dev.rssi);
            const isEditing = editingId === dev.id;

            return (
              <div
                key={dev.id}
                className={`p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-amber-950/20 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                    : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center">
                      {getDeviceIcon(dev.category)}
                    </div>
                    <div>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="px-2 py-0.5 bg-slate-950 border border-emerald-500 rounded text-xs font-mono text-slate-100 focus:outline-none w-32"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(dev.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <button
                            onClick={() => handleSaveRename(dev.id)}
                            className="p-1 rounded bg-emerald-600 text-slate-950"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-slate-100 truncate max-w-[130px]">
                            {dev.name}
                          </span>
                          <button
                            onClick={() => handleStartRename(dev)}
                            className="text-slate-500 hover:text-slate-300 p-0.5"
                            title="Rename device"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                      <span className="text-[10px] text-slate-500 font-mono truncate block max-w-[160px]">
                        {dev.id}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-cyan-300">
                      {formatDistance(dev.distanceMeters)}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[10px] font-mono mt-0.5">
                      <Signal className="w-3 h-3" style={{ color: quality.color }} />
                      <span style={{ color: quality.color }}>{dev.rssi} dBm</span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Source: {dev.source.toUpperCase()}
                  </span>

                  <button
                    onClick={() => onSelectDevice(dev)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                        : 'bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>{isSelected ? 'TRACKING & NAV' : 'TRACK DEVICE'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
