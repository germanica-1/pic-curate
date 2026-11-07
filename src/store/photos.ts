import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { BIN_CAP, type Photo } from './reducer';

const MAX_SIDE = 1024; // enough for a full-screen view, ~10x smaller than camera originals

const photosDir = () => new Directory(Paths.document, 'photos');

export const photoUri = (p: Photo) => new File(photosDir(), p.file).uri;

export type PickResult =
  | { status: 'ok'; photos: Photo[]; failed: number }
  | { status: 'canceled' }
  | { status: 'denied' };

/** Opens the camera or gallery and copies each chosen image into app storage. */
export async function pickPhotos(source: Photo['source']): Promise<PickResult> {
  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { status: 'denied' };
    result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
  } else {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: BIN_CAP,
      quality: 1,
    });
  }
  if (result.canceled) return { status: 'canceled' };

  const photos: Photo[] = [];
  let failed = 0;
  // One at a time: decoding several 12 MP images at once can run out of memory.
  for (const asset of result.assets) {
    try {
      photos.push(await importAsset(asset, source));
    } catch (e) {
      console.warn('Photo import failed', e);
      failed++;
    }
  }
  return { status: 'ok', photos, failed };
}

async function importAsset(asset: ImagePicker.ImagePickerAsset, source: Photo['source']): Promise<Photo> {
  const dir = photosDir();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });

  const ctx = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > MAX_SIDE) {
    ctx.resize(asset.width >= asset.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await ctx.renderAsync();
  const saved = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });

  // The manipulator writes to the cache, which the OS may purge. Move it somewhere durable.
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const file = `${id}.jpg`;
  await new File(saved.uri).move(new File(dir, file));

  return { id, file, w: saved.width, h: saved.height, addedAt: Date.now(), source, inBin: true };
}

export function deletePhotoFile(p: Photo) {
  try {
    const f = new File(photosDir(), p.file);
    if (f.exists) f.delete();
  } catch (e) {
    console.warn('Photo delete failed', e);
  }
}

/** Deletes stored images no saved photo points at (left behind by a crash or a removal the app was killed during). */
export function deleteOrphanFiles(photos: Photo[]) {
  const dir = photosDir();
  if (!dir.exists) return;
  const keep = new Set(photos.map((p) => p.file));
  for (const entry of dir.list()) {
    if (entry instanceof File && !keep.has(entry.name)) entry.delete();
  }
}
