import { useState, useEffect, useRef, useCallback } from 'react';
import { TrackedBleDevice } from '../types/bluetooth';

export function usePythonBridge(
  onDeviceUpdate: (device: TrackedBleDevice) => void,
  onSnapshot?: (devices: any[]) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const classifyDevice = (name: string): TrackedBleDevice['category'] => {
    const n = name.toLowerCase();
    if (n.includes('macbook') || n.includes('laptop') || n.includes('thinkpad') || n.includes('dell') || n.includes('surface') || n.includes('hp')) {
      return 'laptop';
    }
    if (n.includes('desktop') || n.includes('pc') || n.includes('mac') || n.includes('tower') || n.includes('workstation') || n.includes('rig')) {
      return 'desktop';
    }
    if (n.includes('heart') || n.includes('watch') || n.includes('band')) return 'wearable';
    if (n.includes('head') || n.includes('pod') || n.includes('buds') || n.includes('audio')) return 'audio';
    if (n.includes('phone') || n.includes('iphone') || n.includes('pixel')) return 'phone';
    return 'computer';
  };

  const connectBridge = useCallback(() => {
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch {}
    }

    setIsConnecting(true);
    setLastError(null);

    try {
      const ws = new WebSocket('ws://localhost:8765');
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setLastError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'BLE_DEVICE_UPDATE' && data.device) {
            const dev = data.device;
            const devName = dev.name || 'Desktop / Laptop BLE';
            const updated: TrackedBleDevice = {
              id: dev.id,
              name: devName,
              category: classifyDevice(devName),
              rssi: dev.rssi,
              distanceMeters: dev.distance,
              angleDegrees: dev.angle || (Math.abs(hashString(dev.id)) % 360),
              lastSeen: Date.now(),
              rssiHistory: [{ timestamp: Date.now(), rssi: dev.rssi }],
              isRealHardware: true,
              source: 'python-bridge',
              manufacturerData: dev.manufacturerData
            };
            onDeviceUpdate(updated);
          } else if (data.type === 'SNAPSHOT' && Array.isArray(data.devices)) {
            data.devices.forEach((dev: any) => {
              const devName = dev.name || 'Desktop / Laptop BLE';
              onDeviceUpdate({
                id: dev.id,
                name: devName,
                category: classifyDevice(devName),
                rssi: dev.rssi,
                distanceMeters: dev.distance,
                angleDegrees: dev.angle || (Math.abs(hashString(dev.id)) % 360),
                lastSeen: Date.now(),
                rssiHistory: [{ timestamp: Date.now(), rssi: dev.rssi }],
                isRealHardware: true,
                source: 'python-bridge',
                manufacturerData: dev.manufacturerData
              });
            });
            if (onSnapshot) onSnapshot(data.devices);
          }
        } catch (err) {
          console.error('Failed to parse bridge message:', err);
        }
      };

      ws.onerror = () => {
        setLastError('Unable to connect to ws://localhost:8765. Ensure python ble_bridge_server.py is running.');
        setIsConnecting(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
      };
    } catch (err: any) {
      setIsConnecting(false);
      setLastError(err.message || 'WebSocket initialization failed.');
    }
  }, [onDeviceUpdate, onSnapshot]);

  const disconnectBridge = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    lastError,
    connectBridge,
    disconnectBridge
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
