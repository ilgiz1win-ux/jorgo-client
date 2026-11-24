import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Админ: акча кайдан түштү, сатуулар, оңдоо, ижарадагы велосипеддер, баланстар
export type Finance = {
  topups: { method: string; sum: number; count: number }[];
  topupsPending: { sum: number; count: number };
  income: { rent: number; outcall: number; damage: number; adjust: number };
  orders: { count: number; sold: number; soldSum: number; pending: number; pendingSum: number; cancelled: number; expressFees: number };
  ordersByBranch: { branch: string; count: number; sum: number }[];
  topItems: { name: string; qty: number; sum: number }[];
  repairs: { count: number; done: number; active: number; new: number; cancelled: number; outcalls: number };
  bikes: { total: number; busy: number; waiting: number; hidden: number };
  bikesList: { id: string; name: string; available: boolean; renter?: string | null; phone?: string | null; since?: string | null; contract?: number | null; days?: number | null; daily?: number | null }[];
  rentalsStarted: number;
  balances: { total: number; debt: number; debtors: number };
};

const read = async <T,>(k: string, d: T): Promise<T> => {
  try {
    const v = await AsyncStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
};

// Демо режим: жергиликтүү маалыматтан болжолдуу эсеп
async function localFinance(days: number): Promise<Finance> {
  const since = days > 0 ? Date.now() - days * 86400000 : 0;
  type Tx = { amount: number; kind: string; createdAt: string; userId: string };
  const tx = (await read<Tx[]>('jorgo.local.walletTx', [])).filter((t) => new Date(t.createdAt).getTime() >= since);
  const tops = (await read<{ amount: number; method: string; status: string; createdAt: string }[]>('jorgo.local.topups', [])).filter((t) => new Date(t.createdAt).getTime() >= since);
  const rentals = await read<{ id: string; name: string; available: boolean }[] | null>('jorgo.local.rentals', null);
  const reqs = await read<{ bikeId: string; status: string; name: string; phone: string; startedAt?: string; contractNo?: number; chargedDays?: number; dailyPrice?: number }[]>('jorgo.local.rentRequests', []);
  const repairs = (await read<{ status: string; outcall: boolean; createdAt: string }[]>('jorgo.local.repairs', [])).filter((r) => new Date(r.createdAt).getTime() >= since);
  const sum = (k: string) => -tx.filter((t) => t.kind === k).reduce((s, t) => s + t.amount, 0);
  const byMethod = new Map<string, { sum: number; count: number }>();
  tops.filter((t) => t.status === 'approved').forEach((t) => {
    const m = byMethod.get(t.method) ?? { sum: 0, count: 0 };
    byMethod.set(t.method, { sum: m.sum + t.amount, count: m.count + 1 });
  });
  const bikes = rentals ?? [{ id: 'demo-rent-1', name: 'Курьерлер үчүн электровелосипед', available: true }];
  const active = reqs.filter((r) => r.status === 'active');
  const all = await read<Tx[]>('jorgo.local.walletTx', []);
  const bal = new Map<string, number>();
  all.forEach((t) => bal.set(t.userId, (bal.get(t.userId) ?? 0) + t.amount));
  const balances = [...bal.values()];
  return {
    topups: [...byMethod.entries()].map(([method, v]) => ({ method, ...v })),
    topupsPending: { sum: tops.filter((t) => t.status === 'new').reduce((s, t) => s + t.amount, 0), count: tops.filter((t) => t.status === 'new').length },
    income: { rent: sum('rent'), outcall: sum('outcall') + sum('refund'), damage: sum('damage'), adjust: -sum('adjust') },
    orders: { count: 0, sold: 0, soldSum: 0, pending: 0, pendingSum: 0, cancelled: 0, expressFees: 0 },
    ordersByBranch: [],
    topItems: [],
    repairs: {
      count: repairs.length,
      done: repairs.filter((r) => r.status === 'done').length,
      active: repairs.filter((r) => r.status === 'accepted' || r.status === 'in_progress').length,
      new: repairs.filter((r) => r.status === 'new').length,
      cancelled: repairs.filter((r) => r.status === 'cancelled').length,
      outcalls: repairs.filter((r) => r.outcall).length,
    },
    bikes: { total: bikes.length, busy: new Set(active.map((r) => r.bikeId)).size, waiting: reqs.filter((r) => r.status === 'new').length, hidden: bikes.filter((b) => !b.available).length },
    bikesList: bikes.map((b) => {
      const a = active.find((r) => r.bikeId === b.id);
      return { id: b.id, name: b.name, available: b.available, renter: a?.name, phone: a?.phone, since: a?.startedAt, contract: a?.contractNo, days: a?.chargedDays, daily: a?.dailyPrice };
    }),
    rentalsStarted: reqs.filter((r) => r.startedAt && new Date(r.startedAt).getTime() >= since).length,
    balances: { total: balances.reduce((s, b) => s + b, 0), debt: -balances.filter((b) => b < 0).reduce((s, b) => s + b, 0), debtors: balances.filter((b) => b < 0).length },
  };
}

export async function fetchFinance(days: number): Promise<Finance> {
  if (!supabase) return localFinance(days);
  const { data, error } = await supabase.rpc('admin_finance', { p_days: days });
  if (error) throw error;
  return data as Finance;
}
