import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Alert, AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ArchiveModal } from './src/components/ArchiveModal';
import { BinView } from './src/components/BinView';
import { Kira } from './src/components/Kira';
import { PhotoViewer } from './src/components/PhotoViewer';
import { ProgressModal } from './src/components/ProgressModal';
import { haptic, type Feel } from './src/haptics';
import { currentStreak, dayKey } from './src/logic/streak';
import type { KiraEvent } from './src/mascot/lines';
import { openingReaction, reactionFor } from './src/mascot/react';
import { useKira } from './src/mascot/useKira';
import { AppStoreProvider, useAppStore } from './src/store/AppStore';
import { deletePhotoFile, photoUri, pickPhotos } from './src/store/photos';
import { reducer, type Action, type Photo } from './src/store/reducer';
import { colors } from './src/theme';

const UNDO_MS = 4000;

const HAPTICS: Partial<Record<KiraEvent, Feel>> = {
  unlocked: 'success',
  streakUp: 'success',
  added: 'tap',
  addedMany: 'tap',
  addedCamera: 'tap',
  binFull: 'tap',
  removed: 'thud',
};

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <AppStoreProvider>
        <Home />
      </AppStoreProvider>
      <StatusBar style="dark" />
    </GestureHandlerRootView>
  );
}

// Wait for saved data so Kira's opening line knows the user's streak.
function Home() {
  const { state } = useAppStore();
  return state.loaded ? <Main /> : null;
}

function Main() {
  const { state, dispatch } = useAppStore();
  const { speech, say } = useKira(() => openingReaction(state, dayKey(new Date())));
  const [busy, setBusy] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [undoVisible, setUndoVisible] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  // Re-render when the app comes back to the foreground, so the streak is right after midnight.
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, []);
  // The removed photo's file is only deleted once the undo window closes.
  const pendingRemoval = useRef<Photo | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);

  const bin = useMemo(
    () => state.photos.filter((p) => p.inBin).map((p) => ({ id: p.id, uri: photoUri(p), w: p.w, h: p.h })),
    [state.photos],
  );
  const archived = useMemo(
    () => state.photos.filter((p) => !p.inBin).reverse().map((p) => ({ id: p.id, uri: photoUri(p) })),
    [state.photos],
  );
  const streak = currentStreak(state.stats.days, dayKey(new Date()));

  /** Dispatches an action and lets Kira react to what it changed. */
  const act = (action: Action) => {
    const prev = latest.current;
    const next = reducer(prev, action); // pure, so this matches what the store computes
    latest.current = next;
    dispatch(action);
    const reaction = reactionFor(prev, next, dayKey(new Date()));
    if (reaction) {
      say(reaction);
      const feel = HAPTICS[reaction.event];
      if (feel) haptic(feel);
    }
  };

  const add = async (source: Photo['source']) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await pickPhotos(source);
      if (result.status === 'denied') {
        Alert.alert('Camera access is off', 'To take photos here, allow camera access in Settings.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]);
      } else if (result.status === 'ok') {
        if (result.photos.length) act({ type: 'added', photos: result.photos, now: Date.now() });
        if (result.failed) Alert.alert(`${result.failed} photo(s) could not be added`, 'Please try those again.');
      }
    } catch (e) {
      Alert.alert('Could not add photos', String(e));
    } finally {
      setBusy(false);
    }
  };

  const commitRemoval = () => {
    clearTimeout(undoTimer.current);
    if (pendingRemoval.current) deletePhotoFile(pendingRemoval.current);
    pendingRemoval.current = null;
    setUndoVisible(false);
  };

  const remove = (id: string) => {
    const photo = latest.current.photos.find((p) => p.id === id);
    if (!photo) return;
    commitRemoval(); // finish any earlier removal first
    pendingRemoval.current = photo;
    act({ type: 'removed', id });
    setUndoVisible(true);
    undoTimer.current = setTimeout(commitRemoval, UNDO_MS);
  };

  const undo = () => {
    clearTimeout(undoTimer.current);
    if (pendingRemoval.current) act({ type: 'restored', photo: pendingRemoval.current });
    pendingRemoval.current = null;
    setUndoVisible(false);
  };

  return (
    <>
      {/* box-none: the empty part of the header overlaps the bin and must not swallow drags */}
      <View style={styles.header} pointerEvents="box-none">
        <Pressable
          style={[styles.streakChip, streak.status === 'at-risk' && styles.streakChipAtRisk]}
          onPress={() => setProgressOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Streak ${streak.count} days. Open progress`}
          hitSlop={8}
        >
          <Ionicons name="flame" size={16} color={streak.count ? colors.stitch : colors.muted} />
          <Text style={styles.streakText}>{streak.count}</Text>
        </Pressable>
        <Kira speech={speech} onTap={() => say({ event: 'tapped' })} />
      </View>

      {/* Knitted basket in Kira's scarf colours; Kira sits on its rim. */}
      <View style={styles.basket}>
        <View style={styles.stitches} pointerEvents="none" />
        <BinView photos={bin} onRemove={remove} onOpen={setViewing} />
        {undoVisible && (
          <View style={styles.toast}>
            <Text style={styles.toastText}>Photo removed</Text>
            <Pressable onPress={undo} accessibilityRole="button" hitSlop={10}>
              <Text style={styles.toastAction}>Undo</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.dock}>
        <DockButton icon="images-outline" label="Gallery" onPress={() => add('gallery')} disabled={busy} />
        <Pressable
          style={({ pressed }) => [styles.camera, (busy || pressed) && styles.cameraDimmed]}
          onPress={() => add('camera')}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Take a photo"
        >
          <Ionicons name="camera" size={32} color={colors.ink} />
        </Pressable>
        <DockButton
          icon="albums-outline"
          label="Archive"
          badge={archived.length}
          onPress={() => setArchiveOpen(true)}
        />
      </View>

      <PhotoViewer
        uri={viewing ? bin.find((p) => p.id === viewing)?.uri ?? null : null}
        onClose={() => setViewing(null)}
      />
      <ProgressModal visible={progressOpen} stats={state.stats} onClose={() => setProgressOpen(false)} />
      <ArchiveModal
        visible={archiveOpen}
        photos={archived}
        onRestore={(id) => {
          act({ type: 'unarchived', id });
          setArchiveOpen(false);
        }}
        onClose={() => setArchiveOpen(false)}
      />
    </>
  );
}

type DockButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  badge?: number;
};

function DockButton({ icon, label, onPress, disabled, badge }: DockButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.dockButton, (disabled || pressed) && styles.dimmed]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} photos` : label}
      hitSlop={8}
    >
      <View>
        <Ionicons name={icon} size={26} color={colors.ink} />
        {!!badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.dockLabel}>{label}</Text>
    </Pressable>
  );
}

const RIM = 10;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream, paddingTop: 52 },
  header: { zIndex: 2, marginBottom: -22 }, // Kira's feet rest on the basket rim
  streakChip: {
    position: 'absolute',
    right: 20,
    top: -6,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderWidth: 1.5,
    borderColor: colors.sand,
  },
  streakChipAtRisk: { borderColor: colors.scarf, backgroundColor: '#FFE9EC' },
  streakText: { fontWeight: '700', color: colors.ink },
  basket: {
    flex: 1,
    marginHorizontal: 14,
    padding: RIM,
    borderRadius: 32,
    backgroundColor: colors.scarf,
  },
  // dashed "knit stitch" line running around the rim
  stitches: {
    position: 'absolute',
    top: RIM / 2 - 1,
    left: RIM / 2 - 1,
    right: RIM / 2 - 1,
    bottom: RIM / 2 - 1,
    borderRadius: 28,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  toast: {
    position: 'absolute',
    left: RIM + 10,
    right: RIM + 10,
    bottom: RIM + 10,
    zIndex: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  toastText: { color: '#fff' },
  toastAction: { color: '#FFD3D8', fontWeight: '700' },
  dock: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 30,
  },
  dockButton: { alignItems: 'center', width: 72, gap: 3 },
  dockLabel: { fontSize: 12, fontWeight: '600', color: colors.ink },
  dimmed: { opacity: 0.45 },
  camera: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.scarf,
    borderWidth: 4,
    borderColor: '#fff',
  },
  cameraDimmed: { opacity: 0.6 },
  badge: {
    position: 'absolute',
    right: -10,
    top: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
