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
  pickedUpAt?: string;
  deliveredAt?: string;
};

type Row = {
  id: string;
  created_at: string;
  number: string;
  user_id: string | null;
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
  picked_up_at: string | null;
  delivered_at: string | null;
};

const LOCAL = 'jorgo.local.serverOrders';

const fromRow = (r: Row): ServerOrder => ({
  id: r.id,
  createdAt: r.created_at,
  number: r.number,
  userId: r.user_id ?? undefined,
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

export async function createOrder(o: Omit<ServerOrder, 'id' | 'createdAt' | 'status' | 'expressFee' | 'pickedUpAt' | 'deliveredAt'>): Promise<void> {
  if (!supabase) {
    const l = await readLocal();
    l.unshift({ ...o, id: String(Date.now()), createdAt: new Date().toISOString(), status: 'new' });
    await writeLocal(l);
    return;
  }
  const { error } = await supabase.from('orders').insert({
    number: o.number,
    delivery: 'express',
    branch: o.branch,
    items: o.items,
    goods_total: o.goodsTotal,
    name: o.name,
    phone: o.phone,
    address: o.address,
    payment: o.payment,
    comment: o.comment,
  });
  if (error) throw error;
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
export async function updateOrder(id: string, patch: { status?: OrderStatus; expressFee?: number | null }): Promise<ServerOrder | null> {
  if (!supabase) {
    const now = new Date().toISOString();
    const l = (await readLocal()).map((o) => {
      if (o.id !== id) return o;
      const status = patch.status ?? o.status;
      return {
        ...o,
        status,
        expressFee: patch.expressFee === undefined ? o.expressFee : patch.expressFee ?? undefined,
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
  const { data, error } = await supabase.from('orders').update(row).eq('id', id).select('*').single();
  if (error) throw error;
  return fromRow(data as Row);
}
