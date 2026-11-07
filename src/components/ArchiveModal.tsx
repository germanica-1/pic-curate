import { FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BIN_CAP } from '../store/reducer';

type ArchivedPhoto = { id: string; uri: string };

type Props = {
  visible: boolean;
  photos: ArchivedPhoto[];
  onRestore: (id: string) => void;
  onClose: () => void;
};

/** Photos that overflowed the bin. Tapping one drops it back in. */
export function ArchiveModal({ visible, photos, onRestore, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Archive</Text>
          <Pressable onPress={onClose} accessibilityRole="button" hitSlop={12}>
            <Text style={styles.close}>Done</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>
          {photos.length
            ? `The bin holds ${BIN_CAP} photos. Tap one to drop it back in; the oldest in the bin moves here.`
            : 'Nothing here yet. When the bin is full, the oldest photos rest here.'}
        </Text>
        <FlatList
          data={photos}
          keyExtractor={(p) => p.id}
          numColumns={3}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <Pressable
              style={styles.cell}
              onPress={() => onRestore(item.id)}
              accessibilityRole="button"
              accessibilityLabel="Put this photo back in the bin"
            >
              <Image source={{ uri: item.uri }} style={styles.thumb} resizeMethod="resize" />
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: '#FFF8F2' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#3B3355' },
  close: { fontSize: 16, fontWeight: '600', color: '#3B3355' },
  hint: { paddingHorizontal: 20, paddingBottom: 12, color: '#7a6a80' },
  grid: { paddingHorizontal: 14, paddingBottom: 40 },
  cell: { flex: 1 / 3, aspectRatio: 1, padding: 4 },
  thumb: { flex: 1, borderRadius: 6, backgroundColor: '#F3E6DC' },
});
