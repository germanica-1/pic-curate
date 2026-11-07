import { beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('expo-haptics', () => ({
  performAndroidHapticsAsync: jest.fn(),
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  AndroidHaptics: { Clock_Tick: 'clock-tick', Virtual_Key: 'virtual-key', Long_Press: 'long-press', Confirm: 'confirm' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

type Mocked = Record<string, jest.Mock<(...args: unknown[]) => Promise<void>>>;

// require() after resetModules: each test needs a fresh module with a different Platform.OS
/* eslint-disable @typescript-eslint/no-require-imports */
function load(os: 'ios' | 'android') {
  jest.resetModules();
  jest.doMock('react-native', () => ({ Platform: { OS: os } }));
  const Haptics = require('expo-haptics') as Mocked;
  for (const fn of Object.values(Haptics)) if (typeof fn === 'function') fn.mockReset().mockResolvedValue(undefined);
  const { haptic } = require('./haptics') as typeof import('./haptics');
  return { haptic, Haptics };
}
/* eslint-enable @typescript-eslint/no-require-imports */

describe('android', () => {
  test('uses system haptics, not the weak vibration-motor calls', async () => {
    const { haptic, Haptics } = load('android');
    await haptic('tap');
    expect(Haptics.performAndroidHapticsAsync).toHaveBeenCalledWith('virtual-key');
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  test('falls back when the phone is too old for a type', async () => {
    const { haptic, Haptics } = load('android');
    Haptics.performAndroidHapticsAsync.mockRejectedValueOnce(new Error('not supported'));
    await haptic('success');
    expect(Haptics.performAndroidHapticsAsync.mock.calls).toEqual([['confirm'], ['long-press']]);
  });
});

describe('ios', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  test('keeps the iOS feedback generators', async () => {
    const { haptic, Haptics } = load('ios');
    await haptic('success');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    expect(Haptics.performAndroidHapticsAsync).not.toHaveBeenCalled();
  });

  test('never throws', async () => {
    const { haptic, Haptics } = load('ios');
    Haptics.impactAsync.mockRejectedValueOnce(new Error('no taptic engine'));
    await expect(haptic('tap')).resolves.toBeUndefined();
  });
});
