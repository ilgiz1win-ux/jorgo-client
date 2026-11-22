import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Бардык кардарларга жалпы билдирмелер: акция, арзандатылган товар, жаңылык
export type Broadcast = { id: string; createdAt: string; title: string; body: string; imageUrl?: string; link?: string };

const LOCAL = 'jorgo.local.broadcasts';
const SEEN = 'jorgo.broadcastsSeen';

type Row = { id: string; created_at: string; title: string; body: string; image_url: string | null; link: string | null };

async function readLocal(): Promise<Broadcast[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(LOCAL)) ?? '[]');
  } catch {
    return [];
  }
}

export async function fetchBroadcasts(): Promise<Broadcast[]> {
  if (!supabase) return readLocal();
  const { data, error } = await supabase.from('broadcasts').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return (data as Row[]).map((r) => ({ id: r.id, createdAt: r.created_at, title: r.title, body: r.body, imageUrl: r.image_url ?? undefined, link: r.link ?? undefined }));
}

export async function sendBroadcast(b: Omit<Broadcast, 'id' | 'createdAt'>): Promise<void> {
  const clean = { title: b.title.trim(), body: b.body.trim(), imageUrl: b.imageUrl || undefined, link: b.link || undefined };
  if (!supabase) {
    const list = await readLocal();
    list.unshift({ ...clean, id: String(Date.now()), createdAt: new Date().toISOString() });
    await AsyncStorage.setItem(LOCAL, JSON.stringify(list.slice(0, 50)));
    return;
  }
  const { error } = await supabase.from('broadcasts').insert({ title: clean.title, body: clean.body, image_url: clean.imageUrl ?? null, link: clean.link ?? null });
  if (error) throw error;
}

export async function deleteBroadcast(id: string): Promise<void> {
  if (!supabase) {
    await AsyncStorage.setItem(LOCAL, JSON.stringify((await readLocal()).filter((b) => b.id !== id)));
    return;
  }
  const { error } = await supabase.from('broadcasts').delete().eq('id', id);
  if (error) throw error;
}

// Бул түзмөктө акыркы жолу качан көрүлдү — окулбагандардын санын эсептөө үчүн
export async function unseenBroadcasts(): Promise<number> {
  try {
    const seen = (await AsyncStorage.getItem(SEEN)) ?? '';
    const list = await fetchBroadcasts();
    return list.filter((b) => b.createdAt > seen).length;
  } catch {
    return 0;
  }
}

export async function markBroadcastsSeen(): Promise<void> {
  await AsyncStorage.setItem(SEEN, new Date().toISOString()).catch(() => {});
}
