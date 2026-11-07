import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useReducer, useRef, type Dispatch, type ReactNode } from 'react';
import { Alert } from 'react-native';
import { deleteOrphanFiles } from './photos';
import { emptyStats } from '../logic/achievements';
import { initialState, parseSaved, reducer, type Action, type Saved, type State } from './reducer';

const KEY = 'pic-curate/state/v1';

const StoreContext = createContext<{ state: State; dispatch: Dispatch<Action> } | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  // If loading failed, never save: writing would overwrite whatever is still on disk.
  const canSave = useRef(false);

  useEffect(() => {
    (async () => {
      let saved: Saved = { photos: [], stats: emptyStats };
      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(KEY);
        if (raw) saved = parseSaved(raw, Date.now());
        canSave.current = true;
        try {
          deleteOrphanFiles(saved.photos);
        } catch (e) {
          // cleanup is optional: never let it make good data look damaged
          console.warn('Orphan cleanup failed', e);
        }
      } catch (e) {
        console.warn('Load failed', e);
        if (raw) {
          // Unreadable data: keep a copy, then start fresh.
          await AsyncStorage.setItem(`${KEY}.corrupt-${Date.now()}`, raw).catch(() => {});
          canSave.current = true;
        }
        Alert.alert(
          'Could not load your collection',
          canSave.current
            ? 'The saved data was damaged. A backup was kept and the bin starts empty.'
            : 'Changes in this session will not be saved. Please restart the app.',
        );
      }
      dispatch({ type: 'loaded', ...saved });
    })();
  }, []);

  useEffect(() => {
    if (!state.loaded || !canSave.current) return;
    AsyncStorage.setItem(KEY, JSON.stringify({ photos: state.photos, stats: state.stats } satisfies Saved)).catch((e) => {
      console.warn('Save failed', e);
      Alert.alert('Could not save', 'Your latest change may be lost if the app closes.');
    });
  }, [state]);

  return <StoreContext value={{ state, dispatch }}>{children}</StoreContext>;
}

export function useAppStore() {
  const store = use(StoreContext);
  if (!store) throw new Error('useAppStore must be used inside AppStoreProvider');
  return store;
}
