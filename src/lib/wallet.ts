import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { DOCS_BUCKET } from './account';
import { base64ToBytes } from './catalogApi';
import { supabase } from './supabase';

// Кардардын балансы: толуктоо (админ ырастайт), выезд акысы
export type WalletSettings = { outcallFee: number; topupInfo: string };
export type WalletTx = { id: string; createdAt: string; amount: number; kind: 'topup' | 'outcall' | 'refund' | 'adjust'; note: string };
export type TopupStatus = 'new' | 'approved' | 'rejected';
export type Topup = { id: string; createdAt: string; userId: string; code: string; amount: number; method: string; senderName: string; senderAccount: string; receipt?: string; comment: string; status: TopupStatus; name?: string; phone?: string };
export type WalletRow = { userId: string; name: string; phone: string; balance: number; lastAt: string };

export const DEFAULT_WALLET: WalletSettings = { outcallFee: 500, topupInfo: 'MBank / O!Деньги: +996 ... (атыңыз)' };

// ---------- Демо режим (Supabase жок) ----------
const L_TX = 'jorgo.local.walletTx';
const L_TOPUP = 'jorgo.local.topups';
const L_SET = 'jorgo.local.walletSettings';
const read = async <T,>(k: string, d: T): Promise<T> => {
  try {
    const v = await AsyncStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
};
const write = (k: string, v: unknown) => AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {});
type LTx = WalletTx & { userId: string; repairId?: string };
export async function localUserId(): Promise<string | null> {
  return read<string | null>('jorgo.local.customer', null);
}
const localBalance = async (u: string) => (await read<LTx[]>(L_TX, [])).filter((t) => t.userId === u).reduce((s, t) => s + t.amount, 0);
const localAdd = async (t: Omit<LTx, 'id' | 'createdAt'>) => {
  const l = await read<LTx[]>(L_TX, []);
  l.unshift({ ...t, id: String(Date.now() + Math.random()), createdAt: new Date().toISOString() });
  await write(L_TX, l);
};
// Демо: выезд акысын алуу / кайтаруу (repairs.ts колдонот)
export async function localChargeOutcall(repairId: string, number: string): Promise<'ok' | 'login' | 'balance'> {
  const u = await localUserId();
  if (!u) return 'login';
  const fee = (await getWalletSettings()).outcallFee;
  if ((await localBalance(u)) < fee) return 'balance';
  await localAdd({ userId: u, amount: -fee, kind: 'outcall', note: `Выезд №${number}`, repairId });
  return 'ok';
}
export async function localRefundOutcall(repairId: string, number: string): Promise<void> {
  const l = await read<LTx[]>(L_TX, []);
  const charge = l.find((t) => t.repairId === repairId && t.kind === 'outcall');
  if (!charge || l.some((t) => t.repairId === repairId && t.kind === 'refund')) return;
  await localAdd({ userId: charge.userId, amount: -charge.amount, kind: 'refund', note: `Выезд №${number} жокко чыгарылды`, repairId });
}

// ---------- Жөндөөлөр ----------
export async function getWalletSettings(): Promise<WalletSettings> {
  if (!supabase) return { ...DEFAULT_WALLET, ...(await read<Partial<WalletSettings>>(L_SET, {})) };
  const { data } = await supabase.from('settings').select('value').eq('key', 'wallet').maybeSingle();
  const v = (data?.value ?? {}) as Partial<WalletSettings>;
  return { outcallFee: Number(v.outcallFee) || DEFAULT_WALLET.outcallFee, topupInfo: v.topupInfo ?? DEFAULT_WALLET.topupInfo };
}
export async function saveWalletSettings(s: WalletSettings): Promise<void> {
  if (!supabase) return write(L_SET, s);
  const { error } = await supabase.from('settings').upsert({ key: 'wallet', value: s });
  if (error) throw error;
}

// ---------- Кардар ----------
export async function myBalance(): Promise<number> {
  if (!supabase) {
    const u = await localUserId();
    return u ? localBalance(u) : 0;
  }
  const { data, error } = await supabase.rpc('wallet_balance');
  if (error) throw error;
  return Number(data) || 0;
}

type TxRow = { id: string; created_at: string; amount: number; kind: WalletTx['kind']; note: string };
const txFrom = (r: TxRow): WalletTx => ({ id: r.id, createdAt: r.created_at, amount: r.amount, kind: r.kind, note: r.note });

export async function fetchTx(userId?: string): Promise<WalletTx[]> {
  if (!supabase) {
    const u = userId ?? (await localUserId());
    return (await read<LTx[]>(L_TX, [])).filter((t) => t.userId === u);
  }
  let q = supabase.from('wallet_tx').select('id,created_at,amount,kind,note').order('created_at', { ascending: false }).limit(100);
  if (userId) q = q.eq('user_id', userId);
  const { data, error } = await q;
  if (error) throw error;
  return (data as TxRow[]).map(txFrom);
}

// Чектин сүрөтү (жабык бакет — кардардын өз папкасы)
export async function pickReceipt(userId: string): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, base64: true });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  let b64 = a.base64 ?? '';
  let mime = a.mimeType ?? 'image/jpeg';
  if (!b64 && a.uri.startsWith('data:')) {
    const m = a.uri.match(/^data:([^;]+);base64,(.*)$/);
    if (m) [, mime, b64] = m;
  }
  if (!b64) return null;
  if (!supabase) return `data:${mime};base64,${b64}`;
  const path = `${userId}/receipt-${Date.now()}.${mime.includes('png') ? 'png' : 'jpg'}`;
  const { error } = await supabase.storage.from(DOCS_BUCKET).upload(path, base64ToBytes(b64), { contentType: mime });
  if (error) throw error;
  return path;
}

export async function sendTopup(t: { amount: number; method: string; senderName: string; senderAccount: string; comment: string }): Promise<{ id: string; code: string }> {
  if (!supabase) {
    const u = await localUserId();
    if (!u) throw new Error('login');
    const l = await read<Topup[]>(L_TOPUP, []);
    const r: Topup = { id: String(Date.now()), createdAt: new Date().toISOString(), userId: u, code: `J${1001 + l.length}`, amount: t.amount, method: t.method, senderName: t.senderName.trim(), senderAccount: t.senderAccount.trim(), comment: t.comment.trim(), status: 'new', name: 'Демо кардар', phone: u.replace('local-', '+') };
    l.unshift(r);
    await write(L_TOPUP, l);
    return { id: r.id, code: r.code };
  }
  const { data, error } = await supabase
    .from('topup_requests')
    .insert({ amount: t.amount, method: t.method, sender_name: t.senderName.trim(), sender_account: t.senderAccount.trim(), comment: t.comment.trim() })
    .select('id,code')
    .single();
  if (error) throw error;
  return data as { id: string; code: string };
}

// Чекти кийин тиркөө (текшериле элек өтүнмөгө)
export async function attachReceipt(id: string, path: string): Promise<void> {
  if (!supabase) {
    const l = await read<Topup[]>(L_TOPUP, []);
    const r = l.find((x) => x.id === id);
    if (r && r.status === 'new') r.receipt = path;
    await write(L_TOPUP, l);
    return;
  }
  const { error } = await supabase.rpc('topup_attach_receipt', { p_id: id, p_path: path });
  if (error) throw error;
}

type TopupRow = { id: string; created_at: string; user_id: string; code: string | null; amount: number; method: string; sender_name?: string; sender_account?: string; receipt: string | null; comment: string; status: TopupStatus };
const topFrom = (r: TopupRow): Topup => ({ id: r.id, createdAt: r.created_at, userId: r.user_id, code: r.code ?? '', amount: r.amount, method: r.method, senderName: r.sender_name ?? '', senderAccount: r.sender_account ?? '', receipt: r.receipt ?? undefined, comment: r.comment, status: r.status });

// Кардар — өзүнүкүн, админ — баарын (RLS)
export async function fetchTopups(): Promise<Topup[]> {
  if (!supabase) {
    const all = await read<Topup[]>(L_TOPUP, []);
    return all;
  }
  const { data, error } = await supabase.from('topup_requests').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  const list = (data as TopupRow[]).map(topFrom);
  // Админ үчүн: аты жана телефону
  const ids = [...new Set(list.map((t) => t.userId))];
  if (ids.length) {
    const { data: ps } = await supabase.from('profiles').select('id,full_name,phone').in('id', ids);
    const by = new Map(((ps ?? []) as { id: string; full_name: string; phone: string }[]).map((p) => [p.id, p]));
    list.forEach((t) => {
      const p = by.get(t.userId);
      if (p) {
        t.name = p.full_name;
        t.phone = p.phone;
      }
    });
  }
  return list;
}

// ---------- Админ ----------
export async function decideTopup(id: string, approve: boolean): Promise<void> {
  if (!supabase) {
    const l = await read<Topup[]>(L_TOPUP, []);
    const t = l.find((x) => x.id === id);
    if (!t || t.status !== 'new') return;
    t.status = approve ? 'approved' : 'rejected';
    await write(L_TOPUP, l);
    if (approve) await localAdd({ userId: t.userId, amount: t.amount, kind: 'topup', note: t.method || 'толуктоо' });
    return;
  }
  const { error } = await supabase.rpc('admin_topup_decide', { p_id: id, p_approve: approve });
  if (error) throw error;
}

export async function fetchWallets(): Promise<WalletRow[]> {
  if (!supabase) {
    const l = await read<LTx[]>(L_TX, []);
    const by = new Map<string, WalletRow>();
    l.forEach((t) => {
      const r = by.get(t.userId) ?? { userId: t.userId, name: 'Демо кардар', phone: t.userId.replace('local-', '+'), balance: 0, lastAt: t.createdAt };
      r.balance += t.amount;
      if (t.createdAt > r.lastAt) r.lastAt = t.createdAt;
      by.set(t.userId, r);
    });
    return [...by.values()];
  }
  const { data, error } = await supabase.rpc('admin_wallets');
  if (error) throw error;
  return (data as { user_id: string; full_name: string; phone: string; balance: number; last_at: string }[]).map((r) => ({ userId: r.user_id, name: r.full_name, phone: r.phone, balance: r.balance, lastAt: r.last_at }));
}

export async function adjustWallet(userId: string, amount: number, note: string): Promise<void> {
  if (!supabase) return localAdd({ userId, amount, kind: 'adjust', note });
  const { error } = await supabase.rpc('admin_wallet_adjust', { p_user: userId, p_amount: amount, p_note: note });
  if (error) throw error;
}

export const TX_LABEL: Record<WalletTx['kind'], string> = { topup: '💰 Толуктоо', outcall: '🚗 Выезд', refund: '↩️ Кайтарылды', adjust: '✏️ Админ' };
export const fmtSom = (n: number) => `${n.toLocaleString('ru-RU')} сом`;
