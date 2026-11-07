import type { ReactNode } from 'react';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

type Props = {
  id: string;
  slot: number;
  w: number;
  h: number;
  transforms: SharedValue<number[]>;
  front: SharedValue<string | null>;
  children?: ReactNode;
};

/** A view that follows physics body #slot. Runs on the UI thread, no React re-renders. */
export function PhotoBody({ id, slot, w, h, transforms, front, children }: Props) {
  const style = useAnimatedStyle(() => {
    const t = transforms.value;
    const i = slot * 3;
    if (t.length <= i) return { opacity: 0 }; // not dropped in yet
    return {
      opacity: 1,
      zIndex: front.value === id ? 1 : 0,
      transform: [
        { translateX: t[i] - w / 2 },
        { translateY: t[i + 1] - h / 2 },
        { rotate: `${t[i + 2]}rad` },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: w, height: h }, style]}>
      {children}
    </Animated.View>
  );
}
