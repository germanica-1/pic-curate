import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { PhysicsWorld, type BodySpec } from '../physics/PhysicsWorld';
import { useTilt } from '../physics/useTilt';
import { haptic } from '../haptics';
import { colors } from '../theme';
import { PhotoBody } from './PhotoBody';

/** A photo to show in the bin; w/h are the image's pixel size (only the ratio matters). */
export type BinPhoto = { id: string; uri: string; w: number; h: number };

const STEP = 1000 / 60;
// Low cap: on a slow phone, catch-up steps make the next frame even later (20 fps at 3).
const MAX_STEPS_PER_FRAME = 2;
const DROP_EVERY_FRAMES = 4; // stagger drops so a full bin rains in instead of exploding apart
// Photo long side scales with the bin: ~110 dp on a typical phone, never tiny or huge.
const longSide = (binWidth: number) => Math.min(130, Math.max(84, binWidth * 0.32));
const FRAME = 5; // polaroid border
const FRAME_BOTTOM = 14;
const TRASH_HEIGHT = 72;
const SHADE = [0.1, 0.06, 0.035, 0.02]; // stacked bands fake a gradient without a gradient library
const TAP_MAX_MOVE = 8; // a touch that barely moves and ends quickly opens the photo
const TAP_MAX_MS = 300;

function bodySize(p: BinPhoto, long: number) {
  const scale = long / Math.max(p.w, p.h);
  const imgW = Math.round(p.w * scale);
  const imgH = Math.round(p.h * scale);
  return { imgW, imgH, w: imgW + 2 * FRAME, h: imgH + FRAME + FRAME_BOTTOM };
}

type Props = { photos: BinPhoto[]; onRemove: (id: string) => void; onOpen: (id: string) => void };

export function BinView({ photos, onRemove, onOpen }: Props) {
  const [world] = useState(() => new PhysicsWorld());
  const [added] = useState(() => new Set<string>()); // ids that have a physics body
  const [queue] = useState<BodySpec[]>([]); // waiting to drop in, always the tail of `photos`
  const drag = useRef({ id: null as string | null, overTrash: false, x: 0, y: 0, at: 0, moved: false });
  const transforms = useSharedValue<number[]>([]);
  const front = useSharedValue<string | null>(null);
  const [binWidth, setBinWidth] = useState(0); // 0 until laid out; no bodies are added before that
  const [dragging, setDragging] = useState(false);
  const [overTrash, setOverTrash] = useState(false);

  const ready = binWidth > 0;
  const sized = useMemo(() => photos.map((p) => ({ ...p, ...bodySize(p, longSide(binWidth)) })), [photos, binWidth]);

  useTilt(
    (x, y) => world.setGravity(x, y),
    () => world.shake(),
  );

  // Keep physics bodies in step with `photos` (same order = same render slots).
  useLayoutEffect(() => {
    if (!ready) return;
    const ids = new Set(sized.map((p) => p.id));
    for (const id of [...added]) {
      if (!ids.has(id)) {
        world.remove(id);
        added.delete(id);
      }
    }
    for (let i = queue.length - 1; i >= 0; i--) if (!ids.has(queue[i].id)) queue.splice(i, 1);
    for (const p of sized) {
      if (!added.has(p.id) && !queue.some((q) => q.id === p.id)) queue.push({ id: p.id, w: p.w, h: p.h });
    }
  }, [sized, ready, world, added, queue]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let frames = 0;
    const tick = () => {
      const now = performance.now();
      acc += now - last;
      last = now;
      if (queue.length && frames % DROP_EVERY_FRAMES === 0) {
        const next = queue.shift()!;
        world.add(next);
        added.add(next.id);
      }
      let n = 0;
      while (acc >= STEP && n < MAX_STEPS_PER_FRAME) {
        world.step(STEP);
        acc -= STEP;
        n++;
      }
      if (n === MAX_STEPS_PER_FRAME) acc = 0;
      transforms.value = world.transforms();
      frames++;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [world, transforms, queue, added]);

  const pan = usePanGesture({
    runOnJS: true, // physics lives on the JS thread
    minDistance: 0,
    onBegin: (e) => {
      const id = world.grab(e.x, e.y);
      drag.current = { id, overTrash: false, x: e.x, y: e.y, at: Date.now(), moved: false };
      if (id) {
        front.value = id;
        setDragging(true);
        haptic('tick');
      }
    },
    onUpdate: (e) => {
      const d = drag.current;
      if (!d.id) return;
      world.moveGrab(e.x, e.y);
      if (Math.hypot(e.x - d.x, e.y - d.y) > TAP_MAX_MOVE) d.moved = true;
      const over = e.y > world.height - TRASH_HEIGHT;
      if (over !== d.overTrash) {
        d.overTrash = over;
        setOverTrash(over);
        if (over) haptic('tap');
      }
    },
    onFinalize: () => {
      const d = drag.current;
      world.release();
      if (d.id && d.overTrash) onRemove(d.id);
      else if (d.id && !d.moved && Date.now() - d.at < TAP_MAX_MS) onOpen(d.id);
      drag.current = { ...d, id: null, overTrash: false };
      setDragging(false);
      setOverTrash(false);
    },
  });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    world.setBounds(width, height);
    // size photos from the first layout only: bodies already in the bin can't be resized
    setBinWidth((w) => w || width);
  };

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.bin} onLayout={onLayout}>
        {/* soft shading under the rim, so the bin reads as having depth */}
        {SHADE.map((opacity, i) => (
          <View key={i} pointerEvents="none" style={[styles.shade, { height: 8 + i * 10, opacity }]} />
        ))}
        {sized.map((p, slot) => (
          <PhotoBody key={p.id} id={p.id} slot={slot} w={p.w} h={p.h} transforms={transforms} front={front}>
            <View style={styles.polaroid}>
              <Image
                source={{ uri: p.uri }}
                style={{ width: p.imgW, height: p.imgH }}
                resizeMethod="resize" // decode at display size, not 1024px
              />
            </View>
          </PhotoBody>
        ))}
        {dragging && (
          <View style={[styles.trash, overTrash && styles.trashActive]} pointerEvents="none">
            <Text style={styles.trashText}>{overTrash ? 'Let go to remove' : 'Drop here to remove'}</Text>
          </View>
        )}
        {ready && !photos.length && (
          <View style={styles.empty} pointerEvents="none">
            <Ionicons name="images-outline" size={40} color={colors.muted} />
            <Text style={styles.emptyText}>Your bin is empty. Take a photo or pick some from your gallery.</Text>
          </View>
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  bin: { flex: 1, overflow: 'hidden', borderRadius: 22, backgroundColor: colors.sand },
  shade: { position: 'absolute', left: 0, right: 0, top: 0, backgroundColor: colors.stitch },
  polaroid: {
    flex: 1,
    backgroundColor: '#fff',
    padding: FRAME,
    paddingBottom: FRAME_BOTTOM,
    borderRadius: 3,
    // a border, not a shadow: 30 moving shadows are expensive on iOS
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d9c9bc',
  },
  trash: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: TRASH_HEIGHT,
    zIndex: 2, // above the pile and the dragged photo
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 51, 85, 0.12)',
  },
  trashActive: { backgroundColor: 'rgba(214, 69, 80, 0.35)' },
  trashText: { color: '#3B3355', fontWeight: '600' },
  empty: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emptyText: { color: colors.muted, textAlign: 'center', fontSize: 15, lineHeight: 21 },
});
