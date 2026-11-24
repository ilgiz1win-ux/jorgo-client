import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Кардарлардын пикирлери: кардар жазат → админ ырастаса башкы бетке чыгат
export type ReviewAbout = 'shop' | 'repair' | 'rental' | 'product' | 'master';
export type ReviewSubmission = { id: string; createdAt: string; name: string; rating: number; text: string; about: ReviewAbout; refTitle: string; status: 'new' | 'approved' | 'rejected' };
const LOCAL = 'jorgo.local.reviewSubs';

const read = async (): Promise<ReviewSubmission[]> => {
  try {
    const v = await AsyncStorage.getItem(LOCAL);
    return v ? (JSON.parse(v) as ReviewSubmission[]) : [];
  } catch {
    return [];
  }
};

export async function sendReview(r: { name: string; rating: number; text: string; about: ReviewAbout; refTitle?: string }): Promise<void> {
  const row = { name: r.name.trim().slice(0, 80) || '—', rating: Math.min(5, Math.max(1, r.rating)), text: r.text.trim().slice(0, 1000), about: r.about, ref_title: (r.refTitle ?? '').slice(0, 120) };
  if (!supabase) {
    const l = await read();
    l.unshift({ id: String(Date.now()), createdAt: new Date().toISOString(), name: row.name, rating: row.rating, text: row.text, about: r.about, refTitle: row.ref_title, status: 'new' });
    await AsyncStorage.setItem(LOCAL, JSON.stringify(l)).catch(() => {});
    return;
  }
  const { error } = await supabase.from('review_submissions').insert(row);
  if (error) throw error;
}

export async function fetchSubmissions(): Promise<ReviewSubmission[]> {
  if (!supabase) return read();
  const { data, error } = await supabase.from('review_submissions').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return (data as { id: string; created_at: string; name: string; rating: number; text: string; about: ReviewAbout; ref_title: string; status: ReviewSubmission['status'] }[]).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    name: r.name,
    rating: r.rating,
    text: r.text,
    about: r.about,
    refTitle: r.ref_title,
    status: r.status,
  }));
}

// Демо режимде ырасталган пикир жергиликтүү пикирлер тизмесине кошулат
export async function decideReview(id: string, approve: boolean, addLocal?: (r: { id: string; name: string; text: string; rating: number }) => Promise<void>): Promise<void> {
  if (!supabase) {
    const l = await read();
    const r = l.find((x) => x.id === id);
    if (!r || r.status !== 'new') return;
    r.status = approve ? 'approved' : 'rejected';
    await AsyncStorage.setItem(LOCAL, JSON.stringify(l)).catch(() => {});
    if (approve && addLocal) await addLocal({ id: `rv-${r.id}`, name: r.name, text: r.text, rating: r.rating });
    return;
  }
  const { error } = await supabase.rpc('admin_review_decide', { p_id: id, p_approve: approve });
  if (error) throw error;
}
