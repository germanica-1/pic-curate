import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type Feel = 'tick' | 'tap' | 'thud' | 'success';

// Android: impactAsync & co. drive the vibration motor at 12–27% strength for 20–60 ms,
// which many phones can't make you feel. The system haptics (what the keyboard uses) are
// crisp and respect the user's "touch feedback" setting.
const ANDROID: Record<Feel, Haptics.AndroidHaptics> = {
  tick: Haptics.AndroidHaptics.Clock_Tick,
  tap: Haptics.AndroidHaptics.Virtual_Key,
  thud: Haptics.AndroidHaptics.Long_Press,
  success: Haptics.AndroidHaptics.Confirm, // Android 11+; falls back to `thud` below
};

const IOS: Record<Feel, () => Promise<void>> = {
  tick: () => Haptics.selectionAsync(),
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  thud: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};

/** Physical feedback. Never throws: a missed buzz must not break the app. */
export function haptic(feel: Feel): Promise<void> {
  const play =
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(ANDROID[feel]).catch(() =>
          // types newer than the phone's Android version throw; use one every version has
          Haptics.performAndroidHapticsAsync(ANDROID.thud),
        )
      : IOS[feel]();
  return play.catch((e) => console.warn('Haptics unavailable', e));
}
