export type DeviceCategory = 
  | 'desktop'
  | 'laptop'
  | 'computer'
  | 'beacon' 
  | 'audio' 
  | 'wearable' 
  | 'phone' 
  | 'tracker' 
  | 'sensor' 
  | 'unknown';

export interface BleGattCharacteristic {
  uuid: string;
  name?: string;
  properties: {
    read?: boolean;
    write?: boolean;
    notify?: boolean;
    indicate?: boolean;
  };
  value?: string;
}

export interface BleGattService {
  uuid: string;
  name: string;
  characteristics: BleGattCharacteristic[];
}

export interface TrackedBleDevice {
  id: string; // MAC address or Web Bluetooth ID
  name: string;
  category: DeviceCategory;
  rssi: number; // in dBm
  txPower?: number; // Measured power at 1 meter
  distanceMeters: number; // Calculated distance
  angleDegrees: number; // 0 - 360 deg fixed room bearing to device
  lastSeen: number; // timestamp
  isTargetLocked?: boolean;
  isConnected?: boolean;
  batteryLevel?: number; // 0 - 100%
  rssiHistory: { timestamp: number; rssi: number }[];
  isRealHardware: true; // ONLY REAL DEVICES
  source: 'web-bluetooth' | 'python-bridge';
  manufacturerData?: string;
  services?: BleGattService[];
}

export interface RadarConfig {
  maxRangeMeters: number;
  sweepSpeedRpm: number;
  soundEnabled: boolean;
  showTrails: boolean;
  showDegrees: boolean;
  showGrid: boolean;
  filterMinRssi: number;
  pathLossExponent: number;
  referenceTxPower: number;
}

export interface BlePacketLog {
  id: string;
  timestamp: string;
  mac: string;
  name: string;
  rssi: number;
  distance: number;
  type: string;
}

export interface OrientationData {
  heading: number; // 0 - 360 compass degrees where the phone is currently pointing
  pitch: number;
  roll: number;
  hasSensor: boolean;
  isCalibrated: boolean;
  offsetHeading: number; // User calibration offset
}

export interface WayfindingGuidance {
  relativeAngle: number; // Angle relative to phone's front (-180 to +180)
  instruction: string; // "Walk forward", "Turn 35° Right", "Turn Around"
  stepsEstimate: number;
  isFacingTarget: boolean;
}
