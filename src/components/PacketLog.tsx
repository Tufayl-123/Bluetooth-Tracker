import React, { useState } from 'react';
import { BlePacketLog } from '../types/bluetooth';
import { Download, Trash2, Pause, Play, FileSpreadsheet, FileJson, Activity } from 'lucide-react';

interface PacketLogProps {
  logs: BlePacketLog[];
  onClearLogs: () => void;
}

export const PacketLog: React.FC<PacketLogProps> = ({ logs, onClearLogs }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  const filteredLogs = logs.filter(
    (l) =>
      l.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      l.mac.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const exportToJson = () => {
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ble_radar_packets_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToCsv = () => {
    const headers = ['Timestamp', 'MAC Address', 'Device Name', 'RSSI (dBm)', 'Est Distance (m)', 'Packet Type'];
    const rows = logs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.mac}"`,
      `"${l.name.replace(/"/g, '""')}"`,
      l.rssi,
      l.distance,
      `"${l.type}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ble_radar_packets_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#070e1b] border border-slate-800 rounded-2xl p-5 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold font-mono text-slate-100">
            BLE PACKET TELEMETRY &amp; SNIFFER LOG ({logs.length})
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filter packets..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-36"
          />

          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-2 py-1 rounded-lg border text-xs font-mono flex items-center gap-1 ${
              isPaused ? 'bg-amber-950 border-amber-500/40 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
            title={isPaused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Paused' : 'Live'}</span>
          </button>

          <button
            onClick={exportToJson}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 flex items-center gap-1 transition-colors"
            title="Export packets to JSON"
          >
            <FileJson className="w-3.5 h-3.5 text-cyan-400" />
            <span>JSON</span>
          </button>

          <button
            onClick={exportToCsv}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 flex items-center gap-1 transition-colors"
            title="Export packets to CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>CSV</span>
          </button>

          <button
            onClick={onClearLogs}
            className="p-1.5 bg-slate-900 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-800 rounded-lg transition-colors"
            title="Clear all packet logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto max-h-72 custom-scrollbar border border-slate-800/80 rounded-xl">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-950/90 text-slate-400 sticky top-0 border-b border-slate-800">
            <tr>
              <th className="py-2 px-3">Time</th>
              <th className="py-2 px-3">MAC / Hardware ID</th>
              <th className="py-2 px-3">Device Name</th>
              <th className="py-2 px-3">Packet Type</th>
              <th className="py-2 px-3 text-right">RSSI</th>
              <th className="py-2 px-3 text-right">Est. Distance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900 bg-[#040811]">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500">
                  No packets captured matching filter.
                </td>
              </tr>
            ) : (
              filteredLogs.slice(-50).reverse().map((l) => (
                <tr key={l.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-1.5 px-3 text-slate-400">{l.timestamp}</td>
                  <td className="py-1.5 px-3 text-cyan-400 font-bold">{l.mac}</td>
                  <td className="py-1.5 px-3 text-slate-200">{l.name}</td>
                  <td className="py-1.5 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-800 text-slate-400">
                      {l.type}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 text-right">
                    <span
                      className={`font-bold ${
                        l.rssi > -60 ? 'text-emerald-400' : l.rssi > -75 ? 'text-amber-400' : 'text-rose-400'
                      }`}
                    >
                      {l.rssi} dBm
                    </span>
                  </td>
                  <td className="py-1.5 px-3 text-right text-slate-300">
                    {l.distance.toFixed(1)} m
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
