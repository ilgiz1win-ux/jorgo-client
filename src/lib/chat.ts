import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Кардар ↔ админ чаты. Ар бир кардардын бир сүйлөшүүсү (userId боюнча).
export type ChatMessage = { id: string; createdAt: string; userId: string; fromAdmin: boolean; body: string; readByAdmin: boolean; readByUser: boolean };
export type ChatThread = { userId: string; name: string; phone: string; lastBody: string; lastAt: string; lastFromAdmin: boolean; unread: number };

type Row = { id: string; created_at: string; user_id: string; from_admin: boolean; body: string; read_by_admin: boolean; read_by_user: boolean };
const fromRow = (r: Row): ChatMessage => ({
  id: r.id,
  createdAt: r.created_at,
  userId: r.user_id,
  fromAdmin: r.from_admin,
  body: r.body,
  readByAdmin: r.read_by_admin,
  readByUser: r.read_by_user,
});

// Демо режим (Supabase жок): баары ушул түзмөктө
const LOCAL = 'jorgo.local.chat';
const readLocal = async (): Promise<ChatMessage[]> => {
  try {
    const v = await AsyncStorage.getItem(LOCAL);
    return v ? (JSON.parse(v) as ChatMessage[]) : [];
  } catch {
    return [];
  }
};
const writeLocal = (l: ChatMessage[]) => AsyncStorage.setItem(LOCAL, JSON.stringify(l)).catch(() => {});

export const CHAT_MAX = 2000;

export async function fetchChat(userId: string): Promise<ChatMessage[]> {
  if (!supabase) return (await readLocal()).filter((m) => m.userId === userId);
  const { data, error } = await supabase.from('chat_messages').select('*').eq('user_id', userId).order('created_at', { ascending: true }).limit(500);
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

// fromAdmin=true — админ кардарга жооп берет
export async function sendChat(userId: string, body: string, fromAdmin = false): Promise<ChatMessage> {
  const text = body.trim().slice(0, CHAT_MAX);
  if (!supabase) {
    const m: ChatMessage = { id: String(Date.now()), createdAt: new Date().toISOString(), userId, fromAdmin, body: text, readByAdmin: fromAdmin, readByUser: !fromAdmin };
    const l = await readLocal();
    l.push(m);
    await writeLocal(l);
    return m;
  }
  const { data, error } = await supabase.from('chat_messages').insert({ user_id: userId, from_admin: fromAdmin, body: text }).select('*').single();
  if (error) throw error;
  return fromRow(data as Row);
}

// Админ — кардардын билдирүүлөрүн, кардар — админдин жоопторун окулду деп белгилейт
export async function markChatRead(userId: string, asAdmin: boolean): Promise<void> {
  if (!supabase) {
    const l = (await readLocal()).map((m) =>
      m.userId !== userId ? m : asAdmin && !m.fromAdmin ? { ...m, readByAdmin: true } : !asAdmin && m.fromAdmin ? { ...m, readByUser: true } : m,
    );
    await writeLocal(l);
    return;
  }
  await supabase.rpc('chat_mark_read', { p_user: asAdmin ? userId : null });
}

// Кардар: админ жазып, бирок окула элек жооптордун саны
export async function myChatUnread(userId: string): Promise<number> {
  if (!supabase) return (await readLocal()).filter((m) => m.userId === userId && m.fromAdmin && !m.readByUser).length;
  const { count, error } = await supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('from_admin', true)
    .eq('read_by_user', false);
  if (error) return 0;
  return count ?? 0;
}

// Админ: бардык сүйлөшүүлөр
export async function fetchThreads(): Promise<ChatThread[]> {
  if (!supabase) {
    const l = await readLocal();
    const by = new Map<string, ChatMessage[]>();
    l.forEach((m) => by.set(m.userId, [...(by.get(m.userId) ?? []), m]));
    return [...by.entries()]
      .map(([userId, ms]) => {
        const last = ms[ms.length - 1];
        return {
          userId,
          name: 'Демо кардар',
          phone: userId.replace('local-', '+'),
          lastBody: last.body,
          lastAt: last.createdAt,
          lastFromAdmin: last.fromAdmin,
          unread: ms.filter((m) => !m.fromAdmin && !m.readByAdmin).length,
        };
      })
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }
  const { data, error } = await supabase.rpc('admin_chat_threads');
  if (error) throw error;
  return (data as { user_id: string; full_name: string; phone: string; last_body: string; last_at: string; last_from_admin: boolean; unread: number }[]).map((r) => ({
    userId: r.user_id,
    name: r.full_name,
    phone: r.phone,
    lastBody: r.last_body,
    lastAt: r.last_at,
    lastFromAdmin: r.last_from_admin,
    unread: r.unread,
  }));
}

export const fmtChatTime = (iso: string) => {
  const d = new Date(iso);
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return new Date().toDateString() === d.toDateString() ? hm : `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${hm}`;
};
