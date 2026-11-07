import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';

type Props = { uri: string | null; onClose: () => void };

/** Full-screen view of one photo. Tap anywhere to close. */
export function PhotoViewer({ uri, onClose }: Props) {
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close photo">
        {uri && <Image source={{ uri }} style={styles.photo} resizeMode="contain" accessibilityIgnoresInvertColors />}
        <View style={styles.close} pointerEvents="none">
          <Ionicons name="close" size={26} color="#fff" />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20, 16, 32, 0.94)', justifyContent: 'center' },
  photo: { width: '100%', height: '80%' },
  close: {
    position: 'absolute',
    top: 56,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
});
