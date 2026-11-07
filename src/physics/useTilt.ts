import { Accelerometer } from 'expo-sensors';
import { useEffect, useEffectEvent } from 'react';
import { Platform } from 'react-native';

// iOS reports gravity's pull (+1g on the axis pointing down); Android reports the
// opposite sign. Sensor y points up the screen, screen y points down.
// shortcut: signs are from platform docs, confirm on real iOS + Android devices in M1.
const SIGN = Platform.OS === 'ios' ? 1 : -1;
const SMOOTHING = 0.2; // low-pass: 0 = frozen, 1 = raw sensor jitter

const SHAKE_G = 2.2; // total acceleration (gravity is 1) that counts as a shake
const SHAKE_COOLDOWN_MS = 600;

/** Calls onGravity(x, y) about 60 times a second with screen-space gravity in g, and onShake on a shake. */
export function useTilt(onGravity: (x: number, y: number) => void, onShake: () => void) {
  const emitGravity = useEffectEvent(onGravity);
  const emitShake = useEffectEvent(onShake);

  useEffect(() => {
    let gx = 0;
    let gy = 1;
    let lastShake = 0;
    Accelerometer.setUpdateInterval(16);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      gx += (SIGN * x - gx) * SMOOTHING;
      gy += (-SIGN * y - gy) * SMOOTHING;
      emitGravity(gx, gy);
      const now = Date.now();
      if (Math.hypot(x, y, z) > SHAKE_G && now - lastShake > SHAKE_COOLDOWN_MS) {
        lastShake = now;
        emitShake();
      }
    });
    return () => sub.remove();
  }, []);
}
