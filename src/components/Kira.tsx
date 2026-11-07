import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { Speech } from '../mascot/useKira';
import { colors } from '../theme';

// The original artwork, used as-is (never edited); all motion is transforms.
const KIRA = require('../../assets/mascot/removedbg_mascot.png');

type Props = { speech: Speech; onTap: () => void };

export function Kira({ speech, onTap }: Props) {
  const reduceMotion = useReducedMotion();
  const breathe = useSharedValue(1);
  const lift = useSharedValue(0);
  const tilt = useSharedValue(0);

  // One slow, quiet idle motion so she feels alive.
  useEffect(() => {
    if (reduceMotion) return;
    breathe.value = withRepeat(withTiming(1.02, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduceMotion, breathe]);

  // React to each new line.
  useEffect(() => {
    if (reduceMotion) return;
    const hop = () => withSequence(withTiming(-14, { duration: 140 }), withSpring(0, { damping: 7 }));
    if (speech.mood === 'hop') lift.value = hop();
    if (speech.mood === 'tilt') {
      tilt.value = withSequence(withTiming(-0.14, { duration: 220 }), withTiming(0.05, { duration: 260 }), withSpring(0));
    }
    if (speech.mood === 'wiggle') {
      lift.value = hop();
      tilt.value = withSequence(
        ...[0.12, -0.12, 0.08, -0.08].map((r) => withTiming(r, { duration: 110 })),
        withSpring(0),
      );
    }
  }, [speech.id, speech.mood, reduceMotion, lift, tilt]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { rotate: `${tilt.value}rad` }, { scale: breathe.value }],
  }));

  return (
    <View style={styles.row} pointerEvents="box-none">
      <Pressable onPress={onTap} accessibilityRole="button" accessibilityLabel="Kira the bunny. Tap to say hi">
        <Animated.Image source={KIRA} style={[styles.kira, bodyStyle]} resizeMode="contain" />
      </Pressable>
      <Animated.View key={speech.id} entering={FadeIn.duration(220)} style={styles.bubble} accessibilityLiveRegion="polite">
        <View style={styles.tail} />
        <Text style={styles.text}>{speech.text}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 16 },
  kira: { width: 104, height: 125 },
  bubble: {
    flex: 1,
    marginLeft: 10,
    marginBottom: 18,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: colors.sand,
  },
  // a small rotated square peeking out of the bubble's left edge, pointing at Kira
  tail: {
    position: 'absolute',
    left: -7,
    top: '50%',
    width: 12,
    height: 12,
    marginTop: -6,
    backgroundColor: '#fff',
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: colors.sand,
    transform: [{ rotate: '45deg' }],
  },
  text: { color: colors.ink, fontSize: 15, lineHeight: 21 },
});
