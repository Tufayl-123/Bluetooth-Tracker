import { useState, useEffect, useCallback, useRef } from 'react';
import { OrientationData, WayfindingGuidance } from '../types/bluetooth';

export function useDeviceOrientation() {
  const [orientation, setOrientation] = useState<OrientationData>({
    heading: 0,
    pitch: 0,
    roll: 0,
    hasSensor: false,
    isCalibrated: false,
    offsetHeading: 0,
  });

  const [permissionRequested, setPermissionRequested] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [manualHeading, setManualHeading] = useState<number | null>(null);
  const [invertedCompass, setInvertedCompass] = useState<boolean>(false);
  const [targetLaptopBearing, setTargetLaptopBearing] = useState<number>(0);
  const [isCalibrated, setIsCalibrated] = useState<boolean>(false);

  const lastHeadingRef = useRef<number>(0);

  // Request permission for iOS 13+ devices
  const requestCompassPermission = useCallback(async () => {
    setPermissionRequested(true);
    if (
      typeof window !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
        }
      } catch (err) {
        console.warn('Device orientation permission rejected:', err);
      }
    } else {
      setPermissionGranted(true);
    }
  }, []);

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let compassHeading: number | null = null;

      // 1. iOS WebKit Compass Heading (0 = North, 90 = East, clockwise)
      if ((e as any).webkitCompassHeading !== undefined && (e as any).webkitCompassHeading !== null) {
        compassHeading = (e as any).webkitCompassHeading;
      }
      // 2. Android Chrome Absolute Orientation (alpha 0 - 360)
      else if (e.alpha !== null) {
        // Standard Android: alpha is counter-clockwise 0-360.
        // To convert to standard clockwise compass heading (0 = N, 90 = E):
        compassHeading = (360 - e.alpha) % 360;
      }

      if (compassHeading !== null && !isNaN(compassHeading)) {
        // Apply optional inversion for non-standard sensor drivers
        let finalHeading = invertedCompass ? (360 - compassHeading) % 360 : compassHeading;

        // Smooth out tiny sensor micro-jitters using circular difference
        const prev = lastHeadingRef.current;
        const diff = ((finalHeading - prev + 540) % 360) - 180;
        const smoothed = (prev + diff * 0.35 + 360) % 360;
        lastHeadingRef.current = smoothed;

        setOrientation((prevState) => ({
          ...prevState,
          heading: smoothed,
          pitch: e.beta || 0,
          roll: e.gamma || 0,
          hasSensor: true,
        }));
      }
    };

    // Listen to deviceorientationabsolute on Android Chrome if available
    const hasAbsoluteEvent = 'ondeviceorientationabsolute' in window;
    const eventName = hasAbsoluteEvent ? 'deviceorientationabsolute' : 'deviceorientation';

    window.addEventListener(eventName as any, handleOrientation as any, true);
    // Also listen to fallback standard deviceorientation
    if (hasAbsoluteEvent) {
      window.addEventListener('deviceorientation', handleOrientation as any, true);
    }

    return () => {
      window.removeEventListener(eventName as any, handleOrientation as any, true);
      if (hasAbsoluteEvent) {
        window.removeEventListener('deviceorientation', handleOrientation as any, true);
      }
    };
  }, [invertedCompass]);

  // Current effective heading of the phone
  const effectiveHeading = manualHeading !== null ? manualHeading : orientation.heading;

  /**
   * AIM AT LAPTOP CALIBRATION:
   * The user points the top edge of their phone directly at the laptop, then taps this.
   * This locks the physical room bearing of the laptop to the phone's current compass heading!
   */
  const aimAtLaptop = useCallback(() => {
    setTargetLaptopBearing(effectiveHeading);
    setIsCalibrated(true);
    setOrientation((prev) => ({
      ...prev,
      isCalibrated: true,
      offsetHeading: effectiveHeading,
    }));
  }, [effectiveHeading]);

  /**
   * Set specific bearing manually (or via dial tap / nudge)
   */
  const setLaptopBearingDirectly = useCallback((bearingDeg: number) => {
    const normalized = (bearingDeg % 360 + 360) % 360;
    setTargetLaptopBearing(normalized);
    setIsCalibrated(true);
  }, []);

  /**
   * Micro-adjust laptop bearing (+/- 15 degrees)
   */
  const nudgeLaptopBearing = useCallback((deltaDeg: number) => {
    setTargetLaptopBearing((prev) => (prev + deltaDeg + 360) % 360);
    setIsCalibrated(true);
  }, []);

  /**
   * Calculate turn-by-turn guidance and needle angle pointing directly at the laptop
   */
  const getGuidanceToTarget = useCallback(
    (deviceAngleDeg: number, distanceMeters: number): WayfindingGuidance => {
      // Use calibrated laptop bearing if set, otherwise use deviceAngleDeg
      const roomBearing = isCalibrated ? targetLaptopBearing : deviceAngleDeg;

      // Needle Angle relative to phone's forward screen direction:
      // When phone points at laptop (effectiveHeading === roomBearing), relativeAngle is 0 (points UP).
      // When phone turns right (effectiveHeading increases), relativeAngle is negative (needle turns LEFT to stay on laptop).
      const relativeAngle = ((roomBearing - effectiveHeading + 540) % 360) - 180;

      const isFacingTarget = Math.abs(relativeAngle) <= 18;
      let instruction = '';

      if (distanceMeters <= 0.6) {
        instruction = '🎯 Arrived at Desktop / Laptop!';
      } else if (isFacingTarget) {
        instruction = `▲ Walk Straight Forward ~${Math.max(1, Math.round(distanceMeters * 1.3))} steps`;
      } else if (relativeAngle > 18 && relativeAngle <= 90) {
        instruction = `Turn Right (${Math.round(relativeAngle)}°) toward Laptop`;
      } else if (relativeAngle > 90 && relativeAngle <= 160) {
        instruction = `Turn Sharp Right (${Math.round(relativeAngle)}°)`;
      } else if (relativeAngle < -18 && relativeAngle >= -90) {
        instruction = `Turn Left (${Math.round(Math.abs(relativeAngle))}°) toward Laptop`;
      } else if (relativeAngle < -90 && relativeAngle >= -160) {
        instruction = `Turn Sharp Left (${Math.round(Math.abs(relativeAngle))}°)`;
      } else {
        instruction = 'Turn Around (Laptop is behind you)';
      }

      return {
        relativeAngle,
        instruction,
        stepsEstimate: Math.max(1, Math.round(distanceMeters * 1.3)),
        isFacingTarget,
      };
    },
    [effectiveHeading, targetLaptopBearing, isCalibrated]
  );

  return {
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
    permissionRequested,
    permissionGranted,
    getGuidanceToTarget,
  };
}
