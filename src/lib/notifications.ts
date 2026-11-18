import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Колдонмонун ичиндеги билдирмелер (кардарга жана админге), ижара төлөмдөрү, админдер тизмеси

export type AppNotification = { id: string; createdAt: string; title: string; body: string; kind: string; link?: string; read: boolean };
export type PayMethod = 'cash' | 'mbank' | 'odengi' | 'card' | 'other';
export const PAY_METHODS: { id: PayMethod; label: string }[] = [
  { id: 'cash', label: 'Накталай' },
  { id: 'mbank', label: 'MBANK' },
  { id: 'odengi', label: 'O!Деньги' },
  { id: 'card', label: 'Карта' },
  { id: 'other', label: 'Башка' },
];
export type RentPayment = { id: string; createdAt: string; amount: number; units: number; method: PayMethod; paidUntil: string };

const LOCAL_PAYMENTS = 'jorgo.local.rentPayments';

export async function fetchNotifications(): Promise<AppNotification[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return (data as { id: string; created_at: string; title: string; body: string; kind: string; link: string | null; read: boolean }[]).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    title: r.title,
    body: r.body,
    kind: r.kind,
    link: r.link ?? undefined,
    read: r.read,
  }));
}

export async function unreadCount(): Promise<number> {
  if (!supabase) return 0;
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return 0;
  const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false);
  return count ?? 0;
}

export async function markAllRead(): Promise<void> {
  if (!supabase) return;
  await supabase.from('notifications').update({ read: true }).eq('read', false);
}

// Админ: кардарга өзү билдирме жиберүү
export async function sendNotification(userId: string, title: string, body: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('notifications').insert({ user_id: userId, title, body, kind: 'message' });
  if (error) throw error;
}

// Админ: төлөм кабыл алуу. Жаңы "төлөнгөн мөөнөттү" кайтарат (YYYY-MM-DD).
export async function recordPayment(requestId: string, amount: number, units: number, method: PayMethod, local?: { period: 'day' | 'week' | 'month'; paidUntil?: string }): Promise<string> {
  if (!supabase) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const base = local?.paidUntil && new Date(local.paidUntil) > today ? new Date(local.paidUntil) : today;
    if (local?.period === 'month') base.setMonth(base.getMonth() + units);
    else base.setDate(base.getDate() + units * (local?.period === 'week' ? 7 : 1));
    const until = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
    const all = JSON.parse((await AsyncStorage.getItem(LOCAL_PAYMENTS)) ?? '{}') as Record<string, RentPayment[]>;
    (all[requestId] ??= []).unshift({ id: String(Date.now()), createdAt: new Date().toISOString(), amount, units, method, paidUntil: until });
    await AsyncStorage.setItem(LOCAL_PAYMENTS, JSON.stringify(all));
    return until;
  }
  const { data, error } = await supabase.rpc('record_rent_payment', { p_request: requestId, p_amount: amount, p_units: units, p_method: method });
  if (error) throw error;
  return String(data);
}

export async function fetchPayments(requestId: string): Promise<RentPayment[]> {
  if (!supabase) {
    const all = JSON.parse((await AsyncStorage.getItem(LOCAL_PAYMENTS)) ?? '{}') as Record<string, RentPayment[]>;
    return all[requestId] ?? [];
  }
  const { data, error } = await supabase.from('rent_payments').select('*').eq('request_id', requestId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data as { id: string; created_at: string; amount: number; units: number; method: PayMethod; paid_until: string }[]).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    amount: r.amount,
    units: r.units,
    method: r.method,
    paidUntil: r.paid_until,
  }));
}

// Төлөм абалы: канча күн калды (терс сан — кечикти)
export function daysLeft(paidUntil?: string): number | null {
  if (!paidUntil) return null;
  const [y, m, d] = paidUntil.slice(0, 10).split('-').map(Number);
  const due = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}
export const fmtDay = (iso?: string) => (iso ? iso.slice(0, 10).split('-').reverse().join('.') : '—');

// Админдер
export type AdminUser = { userId: string; login: string };
export const loginLabel = (email: string) => {
  const m = email.match(/^(996)(\d{3})(\d{3})(\d{3})@phone\.jorgo\.app$/);
  return m ? `+${m[1]} ${m[2]} ${m[3]} ${m[4]}` : email;
};

export async function listAdmins(): Promise<AdminUser[]> {
  if (!supabase) return [{ userId: 'local', login: 'Демо админ (PIN)' }];
  const { data, error } = await supabase.rpc('admin_list');
  if (error) throw error;
  return (data as { user_id: string; login: string }[]).map((r) => ({ userId: r.user_id, login: loginLabel(r.login) }));
}

export async function addAdmin(login: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('admin_add', { p_login: login.trim() });
  if (error) throw error;
  return data === true;
}

export async function removeAdmin(userId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc('admin_remove', { p_user: userId });
  if (error) throw error;
}

export async function myUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}
