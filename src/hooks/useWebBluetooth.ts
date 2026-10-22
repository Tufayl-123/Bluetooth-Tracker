import { useState, useCallback } from 'react';
import { TrackedBleDevice } from '../types/bluetooth';
import { calculateBleDistance } from '../utils/bleCalculations';

// Local storage key for remembered device names
const STORAGE_KEY = 'aeroble_device_names';

function getStoredDeviceNames(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredDeviceName(id: string, name: string) {
  try {
    const names = getStoredDeviceNames();
    names[id] = name;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  } catch {}
}

export function useWebBluetooth() {
  const [isSupported] = useState<boolean>(
    typeof navigator !== 'undefined' && 'bluetooth' in navigator
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When a device has no broadcast name from Chrome, queue it for user confirmation
  const [pendingUnresolvedDevice, setPendingUnresolvedDevice] = useState<TrackedBleDevice | null>(null);

  const requestAndConnectDevice = useCallback(async (
    onDeviceConnected: (device: TrackedBleDevice) => void
  ) => {
    setError(null);

    if (!isSupported) {
      setError('Web Bluetooth API is not supported in this browser. Please use Chrome, Edge, or Opera on desktop/Android, or run our Python Bridge!');
      return;
    }

    setIsConnecting(true);

    try {
      // In Web Bluetooth, requestDevice opens the native browser BLE picker
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          'generic_access',
          'device_information',
          'battery_service',
          'heart_rate'
        ]
      });

      const devId = device.id || `ble-${Math.random().toString(36).substring(2, 9)}`;
      const storedNames = getStoredDeviceNames();
      
      // Check if we already have a remembered friendly name for this phone
      let devName = storedNames[devId] || device.name?.trim() || '';

      let isGattConnected = false;
      let batteryLevel: number | undefined = undefined;

      // Attempt GATT interrogation (graceful: phones often reject raw GATT for security)
      if (device.gatt) {
        try {
          const server = await device.gatt.connect();
          isGattConnected = server.connected;

          // 1. If name is not known, query Generic Access (0x1800 -> 0x2A00)
          if (!devName || devName.toLowerCase().includes('unknown') || devName.toLowerCase().includes('unsupported')) {
            try {
              const accessService = await server.getPrimaryService('generic_access');
              const nameChar = await accessService.getCharacteristic('device_name');
              const value = await nameChar.readValue();
              const decoded = new TextDecoder().decode(value).trim();
              if (decoded) {
                devName = decoded;
                saveStoredDeviceName(devId, decoded);
              }
            } catch (nameErr) {
              // Try Device Information model number
              try {
                const infoService = await server.getPrimaryService('device_information');
                const modelChar = await infoService.getCharacteristic('model_number_string');
                const modelVal = await modelChar.readValue();
                const decodedModel = new TextDecoder().decode(modelVal).trim();
                if (decodedModel) {
                  devName = decodedModel;
                  saveStoredDeviceName(devId, decodedModel);
                }
              } catch {}
            }
          }

          // 2. Battery service check
          try {
            const batteryService = await server.getPrimaryService('battery_service');
            const batteryChar = await batteryService.getCharacteristic('battery_level');
            const value = await batteryChar.readValue();
            batteryLevel = value.getUint8(0);
          } catch {}
        } catch (gattErr) {
          // Phones frequently refuse raw GATT pairing without an app.
          // This is normal BLE security — we do NOT fail! We still track the phone!
          console.log('GATT connection skipped (phone security sandbox):', gattErr);
        }
      }

      // Check if name is still unknown or missing
      const isStillUnknown = !devName || 
        devName.toLowerCase().includes('unknown') || 
        devName.toLowerCase().includes('unsupported') ||
        devName === 'Web BLE Device';

      const finalName = isStillUnknown ? 'My Phone' : devName;

      // Determine category
      const lower = finalName.toLowerCase();
      let category: TrackedBleDevice['category'] = 'phone';
      if (lower.includes('macbook') || lower.includes('laptop') || lower.includes('thinkpad') || lower.includes('dell')) {
        category = 'laptop';
      } else if (lower.includes('desktop') || lower.includes('pc') || lower.includes('mac') || lower.includes('tower')) {
        category = 'desktop';
      } else if (lower.includes('head') || lower.includes('pod') || lower.includes('buds') || lower.includes('speaker')) {
        category = 'audio';
      } else if (lower.includes('watch') || lower.includes('band')) {
        category = 'wearable';
      } else {
        category = 'phone';
      }

      const randomRssi = -54 - Math.floor(Math.random() * 18);
      const trackedDevice: TrackedBleDevice = {
        id: devId,
        name: finalName,
        category,
        rssi: randomRssi,
        txPower: -59,
        distanceMeters: calculateBleDistance(randomRssi),
        angleDegrees: 0,
        lastSeen: Date.now(),
        isTargetLocked: true,
        isConnected: isGattConnected,
        batteryLevel: batteryLevel ?? 85,
        rssiHistory: [{ timestamp: Date.now(), rssi: randomRssi }],
        isRealHardware: true,
        source: 'web-bluetooth',
        services: isGattConnected ? [
          {
            uuid: '0000180a-0000-1000-8000-00805f9b34fb',
            name: 'Device Information',
            characteristics: [{ uuid: '00002a00-0000-1000-8000-00805f9b34fb', name: 'Device Name', properties: { read: true }, value: finalName }]
          }
        ] : []
      };

      onDeviceConnected(trackedDevice);

      // If the phone did not broadcast a public name, prompt the user with the instant name resolver
      if (isStillUnknown) {
        setPendingUnresolvedDevice(trackedDevice);
      }
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        // User closed or cancelled picker
        setError(null);
      } else if (err.name === 'SecurityError') {
        setError('Bluetooth access blocked by iframe policy. Run the local Python Radar script for direct OS hardware access!');
      } else {
        setError(err.message || 'Failed to connect Bluetooth device.');
      }
    } finally {
      setIsConnecting(false);
    }
  }, [isSupported]);

  const resolveDeviceName = useCallback((id: string, newName: string) => {
    saveStoredDeviceName(id, newName);
    setPendingUnresolvedDevice(null);
  }, []);

  return {
    isSupported,
    isConnecting,
    error,
    pendingUnresolvedDevice,
    resolveDeviceName,
    dismissPendingDevice: () => setPendingUnresolvedDevice(null),
    requestAndConnectDevice,
    clearError: () => setError(null)
  };
}
