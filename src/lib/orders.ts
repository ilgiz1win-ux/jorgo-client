import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Экспресс заказдары базада: абалы, жол акысы, товардын суммасы. Кардар өзүнүкүн, админ баарын көрөт.
export type OrderStatus = 'new' | 'picked_up' | 'delivered' | 'cancelled';
export const ORDER_STEPS: OrderStatus[] = ['new', 'picked_up', 'delivered'];

export type OrderItem = { name: string; qty: number; price: number };
export type ServerOrder = {
  id: string;
  createdAt: string;
  number: string;
  userId?: string;
  delivery: 'pickup' | 'express';
  branch: string;
  items: OrderItem[];
  goodsTotal: number;
  expressFee?: number;
  name: string;
  phone: string;
  address: string;
  payment: string;
  comment: string;
  status: OrderStatus;
  cancelReason?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
};

type Row = {
  id: string;
  created_at: string;
  number: string;
  user_id: string | null;
  delivery: 'pickup' | 'express';
  branch: string;
  items: OrderItem[];
  goods_total: number;
  express_fee: number | null;
  name: string;
  phone: string;
  address: string;
  payment: string;
  comment: string;
  status: OrderStatus;
  cancel_reason: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
};

const LOCAL = 'jorgo.local.serverOrders';

const fromRow = (r: Row): ServerOrder => ({
  id: r.id,
  createdAt: r.created_at,
  number: r.number,
  userId: r.user_id ?? undefined,
  delivery: r.delivery ?? 'express',
  branch: r.branch,
  items: Array.isArray(r.items) ? r.items : [],
  goodsTotal: r.goods_total,
  expressFee: r.express_fee ?? undefined,
  name: r.name,
  phone: r.phone,
  address: r.address,
  payment: r.payment,
  comment: r.comment,
  status: r.status,
  cancelReason: r.cancel_reason || undefined,
  pickedUpAt: r.picked_up_at ?? undefined,
  deliveredAt: r.delivered_at ?? undefined,
});

async function readLocal(): Promise<ServerOrder[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(LOCAL)) ?? '[]');
  } catch {
    return [];
  }
}
const writeLocal = (l: ServerOrder[]) => AsyncStorage.setItem(LOCAL, JSON.stringify(l)).catch(() => {});

// Кара тизмедеги номерден заказ өтпөйт — 'blocked' кайтарат
export async function createOrder(o: Omit<ServerOrder, 'id' | 'createdAt' | 'status' | 'expressFee' | 'pickedUpAt' | 'deliveredAt' | 'cancelReason'>): Promise<'ok' | 'blocked' | 'error'> {
  if (!supabase) {
    if ((await fetchBlacklist()).some((b) => b.phone === phone9(o.phone))) return 'blocked';
    const l = await readLocal();
    l.unshift({ ...o, id: String(Date.now()), createdAt: new Date().toISOString(), status: 'new' });
    await writeLocal(l);
    return 'ok';
  }
  const { error } = await supabase.from('orders').insert({
    number: o.number,
    delivery: o.delivery,
    branch: o.branch,
    items: o.items,
    goods_total: o.goodsTotal,
    name: o.name,
    phone: o.phone,
    address: o.address,
    payment: o.payment,
    comment: o.comment,
    ...(o.userId ? {} : { user_id: null }),
  });
  if (!error) return 'ok';
  if (error.code === '42501' || /row-level security/i.test(error.message)) return 'blocked';
  return 'error';
}

export async function fetchOrders(userId?: string): Promise<ServerOrder[]> {
  if (!supabase) {
    const l = await readLocal();
    return userId ? l.filter((o) => o.userId === userId) : l;
  }
  let q = supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200);
  if (userId) q = q.eq('user_id', userId);
  const { data, error } = await q;
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

// Админ: абалды жана/же жол акысын өзгөртүү
export async function updateOrder(id: string, patch: { status?: OrderStatus; expressFee?: number | null; cancelReason?: string }): Promise<ServerOrder | null> {
  if (!supabase) {
    const now = new Date().toISOString();
    const l = (await readLocal()).map((o) => {
      if (o.id !== id) return o;
      const status = patch.status ?? o.status;
      return {
        ...o,
        status,
        expressFee: patch.expressFee === undefined ? o.expressFee : patch.expressFee ?? undefined,
        cancelReason: patch.cancelReason ?? o.cancelReason,
        pickedUpAt: status === 'picked_up' && !o.pickedUpAt ? now : o.pickedUpAt,
        deliveredAt: status === 'delivered' && !o.deliveredAt ? now : o.deliveredAt,
      };
    });
    await writeLocal(l);
    return l.find((o) => o.id === id) ?? null;
  }
  const row: Record<string, unknown> = {};
  if (patch.status) row.status = patch.status;
  if (patch.expressFee !== undefined) row.express_fee = patch.expressFee;
  if (patch.cancelReason !== undefined) row.cancel_reason = patch.cancelReason;
  const { data, error } = await supabase.from('orders').update(row).eq('id', id).select('*').single();
  if (error) throw error;
  return fromRow(data as Row);
}

// ---------- Кара тизме жана кардарлар (админ гана) ----------
export const phone9 = (p: string) => p.replace(/\D/g, '').slice(-9);
export type BlackItem = { phone: string; reason: string; createdAt: string };
const LOCAL_BL = 'jorgo.local.blacklist';

export async function fetchBlacklist(): Promise<BlackItem[]> {
  if (!supabase) {
    try {
      return JSON.parse((await AsyncStorage.getItem(LOCAL_BL)) ?? '[]');
    } catch {
      return [];
    }
  }
  const { data, error } = await supabase.from('blacklist').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data as { phone: string; reason: string; created_at: string }[]).map((r) => ({ phone: r.phone, reason: r.reason, createdAt: r.created_at }));
}

export async function addToBlacklist(phone: string, reason: string): Promise<void> {
  const p = phone9(phone);
  if (p.length !== 9) throw new Error('Номерди туура жазыңыз');
  if (!supabase) {
    const l = (await fetchBlacklist()).filter((x) => x.phone !== p);
    l.unshift({ phone: p, reason: reason.trim(), createdAt: new Date().toISOString() });
    await AsyncStorage.setItem(LOCAL_BL, JSON.stringify(l));
    return;
  }
  const { error } = await supabase.from('blacklist').upsert({ phone: p, reason: reason.trim().slice(0, 200) });
  if (error) throw error;
}

export async function removeFromBlacklist(phone: string): Promise<void> {
  const p = phone9(phone);
  if (!supabase) {
    await AsyncStorage.setItem(LOCAL_BL, JSON.stringify((await fetchBlacklist()).filter((x) => x.phone !== p)));
    return;
  }
  const { error } = await supabase.from('blacklist').delete().eq('phone', p);
  if (error) throw error;
}

export type Customer = {
  id: string;
  createdAt: string;
  login: string;
  fullName: string;
  phone: string;
  verified: boolean;
  orders: number;
  rents: number;
  blacklisted: boolean;
  blacklistReason: string;
};

export async function fetchCustomers(): Promise<Customer[]> {
  if (!supabase) {
    const bl = await fetchBlacklist();
    const all = JSON.parse((await AsyncStorage.getItem('jorgo.local.profiles')) ?? '{}') as Record<string, { id: string; fullName: string; phone: string; verified: boolean; email?: string }>;
    const orders = await readLocal();
    return Object.values(all).map((p) => {
      const b = p.phone ? bl.find((x) => x.phone === phone9(p.phone)) : undefined;
      return {
        id: p.id,
        createdAt: new Date().toISOString(),
        login: p.email ?? p.phone,
        fullName: p.fullName,
        phone: p.phone,
        verified: p.verified,
        orders: orders.filter((o) => o.userId === p.id).length,
        rents: 0,
        blacklisted: !!b,
        blacklistReason: b?.reason ?? '',
      };
    });
  }
  const { data, error } = await supabase.rpc('admin_customers');
  if (error) throw error;
  return (
    data as { id: string; created_at: string; login: string; full_name: string; phone: string; verified: boolean; orders: number; rents: number; blacklisted: boolean; blacklist_reason: string }[]
  ).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    login: r.login.endsWith('@phone.jorgo.app') ? '' : r.login,
    fullName: r.full_name,
    phone: r.phone,
    verified: r.verified,
    orders: Number(r.orders),
    rents: Number(r.rents),
    blacklisted: r.blacklisted,
    blacklistReason: r.blacklist_reason,
  }));
}
