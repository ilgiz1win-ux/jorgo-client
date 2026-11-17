import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from './catalogApi';

// Галереядан сүрөт тандап, серверге жүктөйт. Кардар жокко чыгарса — null.
export async function pickAndUploadImage(aspect: [number, number]): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 0.6,
    base64: true,
  });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  let base64 = asset.base64 ?? '';
  let mime = asset.mimeType ?? 'image/jpeg';
  if (!base64 && asset.uri.startsWith('data:')) {
    const m = asset.uri.match(/^data:([^;]+);base64,(.*)$/);
    if (m) [, mime, base64] = m;
  }
  if (!base64) throw new Error('Сүрөттү окуй алган жокпуз, башкасын тандаңыз');
  return uploadImage(base64, mime);
}
