/**
 * Bluetooth Low Energy (BLE) Distance & Signal Processing Mathematics
 */

/**
 * Calculates estimated distance in meters using the Log-Distance Path Loss Model:
 * RSSI = -10 * n * log10(d) + A
 * d = 10 ^ ((A - RSSI) / (10 * n))
 *
 * @param rssi Current received signal strength indicator in dBm (e.g. -68)
 * @param txPower Measured power (RSSI) at 1 meter distance (typically -59 dBm to -65 dBm)
 * @param n Path loss exponent (2.0 = free space, 2.7 - 3.5 = home/office, 4.0+ = metal/dense obstacles)
 */
export function calculateBleDistance(
  rssi: number,
  txPower: number = -59,
  n: number = 2.5
): number {
  if (rssi === 0) {
    return -1.0; // Cannot determine
  }

  const ratio = (txPower - rssi) / (10 * n);
  const distance = Math.pow(10, ratio);

  // Return clamped realistic distance rounded to 1 decimal place
  return Math.min(Math.max(Math.round(distance * 10) / 10, 0.1), 150);
}

/**
 * Signal Quality classification based on standard BLE dBm ranges
 */
export function getSignalQuality(rssi: number): {
  label: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Lost';
  color: string;
  percentage: number;
} {
  if (rssi >= -50) {
    return { label: 'Excellent', color: '#10b981', percentage: 100 }; // emerald-500
  } else if (rssi >= -67) {
    return { label: 'Good', color: '#06b6d4', percentage: 80 }; // cyan-500
  } else if (rssi >= -80) {
    return { label: 'Fair', color: '#f59e0b', percentage: 50 }; // amber-500
  } else if (rssi >= -95) {
    return { label: 'Poor', color: '#ef4444', percentage: 25 }; // red-500
  } else {
    return { label: 'Lost', color: '#6b7280', percentage: 5 }; // gray-500
  }
}

/**
 * Exponential Moving Average (EMA) to smooth erratic RF multipath fluctuations
 */
export function calculateEma(current: number, previous: number, alpha: number = 0.25): number {
  return alpha * current + (1 - alpha) * previous;
}

/**
 * Converts polar coordinates (radius in meters, angle in degrees)
 * to normalized canvas Cartesian coordinates (-1 to 1)
 */
export function polarToCartesian(
  distanceMeters: number,
  angleDegrees: number,
  maxRangeMeters: number
): { x: number; y: number } {
  const normalizedRadius = Math.min(distanceMeters / maxRangeMeters, 1);
  const radians = ((angleDegrees - 90) * Math.PI) / 180; // 0 deg is North (Top)

  return {
    x: normalizedRadius * Math.cos(radians),
    y: normalizedRadius * Math.sin(radians),
  };
}

/**
 * Format distance in metric or imperial
 */
export function formatDistance(meters: number): string {
  if (meters < 1) {
    return `${Math.round(meters * 100)} cm`;
  }
  return `${meters.toFixed(1)} m (${(meters * 3.28084).toFixed(1)} ft)`;
}
