import AsyncStorage from '@react-native-async-storage/async-storage';
import { mastersApi } from './contentApi';
import { supabase } from './supabase';

// Админдин башкы бети: точкалар боюнча акча (бүгүн / ушул ай), күн сайын, мастерлердин иши
export type Money = { sales: number; repair: number; outcall: number; rent: number; total: number };
export type MasterWork = {
  id: string;
  name: string;
  branch: string;
  active: boolean;
  outcall: boolean;
  rating: number;
  panel: boolean;
  hasAccount: boolean;
  todayDone: number;
  monthDone: number;
  totalDone: number;
  todaySum: number;
  monthSum: number;
  monthOutcalls: number;
  activeNow: number;
  monthCancelled: number;
};
export type Overview = {
  branches: { branch: string; today: Money; month: Money }[];
  totalToday: number;
  totalMonth: number;
  days: { day: string; sum: number }[];
  masters: MasterWork[];
  mastersCount: { total: number; active: number; panel: number; outcall: number };
  repairsToday: { new: number; active: number; done: number };
  unassignedDone: { count: number; noPrice: number };
};

const read = async <T,>(k: string, d: T): Promise<T> => {
  try {
    const v = await AsyncStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
};

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const zero = (): Money => ({ sales: 0, repair: 0, outcall: 0, rent: 0, total: 0 });

// Демо режим: ушул түзмөктөгү маалыматтан
async function localOverview(): Promise<Overview> {
  const now = new Date();
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const m0 = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  type R = { id: string; status: string; branch: string; masterId?: string; outcall: boolean; price?: number; doneAt?: string; updatedAt?: string; createdAt: string; number: string };
  const repairs = await read<R[]>('jorgo.local.repairs', []);
  const orders = await read<{ status: string; branch: string; goodsTotal: number; createdAt: string }[]>('jorgo.local.serverOrders', []);
  const tx = await read<{ amount: number; kind: string; createdAt: string; repairId?: string; note?: string }[]>('jorgo.local.walletTx', []);
  const masters = await mastersApi.fetch().catch(() => []);

  const money: { b: string; k: keyof Omit<Money, 'total'>; amt: number; at: number }[] = [];
  orders.filter((o) => o.status === 'picked_up' || o.status === 'delivered').forEach((o) => money.push({ b: o.branch || 'Экспресс / башка', k: 'sales', amt: o.goodsTotal || 0, at: new Date(o.createdAt).getTime() }));
  repairs.filter((r) => r.status === 'done').forEach((r) => money.push({ b: r.branch || '—', k: 'repair', amt: r.price ?? 0, at: new Date(r.doneAt ?? r.updatedAt ?? r.createdAt).getTime() }));
  tx.forEach((t) => {
    const at = new Date(t.createdAt).getTime();
    if (t.kind === 'rent' || t.kind === 'damage') money.push({ b: 'Ижара', k: 'rent', amt: -t.amount, at });
    else if (t.kind === 'outcall' || t.kind === 'refund') {
      const r = repairs.find((x) => x.id === t.repairId || (t.note ?? '').includes(`№${x.number}`));
      money.push({ b: r?.branch || '—', k: 'outcall', amt: -t.amount, at });
    }
  });

  const by = new Map<string, { today: Money; month: Money }>();
  money.forEach((m) => {
    if (m.at < m0) return;
    const e = by.get(m.b) ?? { today: zero(), month: zero() };
    e.month[m.k] += m.amt;
    e.month.total += m.amt;
    if (m.at >= t0) {
      e.today[m.k] += m.amt;
      e.today.total += m.amt;
    }
    by.set(m.b, e);
  });
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const a = d.getTime();
    const b = a + 86400000;
    return { day: dayKey(d), sum: money.filter((m) => m.at >= a && m.at < b).reduce((s, m) => s + m.amt, 0) };
  });
  const doneAt = (r: R) => new Date(r.doneAt ?? r.updatedAt ?? r.createdAt).getTime();
  return {
    branches: [...by.entries()]
      .map(([branch, v]) => ({ branch, ...v }))
      .sort((a, b) => Number(a.branch === 'Ижара') - Number(b.branch === 'Ижара') || b.month.total - a.month.total),
    totalToday: money.filter((m) => m.at >= t0).reduce((s, m) => s + m.amt, 0),
    totalMonth: money.filter((m) => m.at >= m0).reduce((s, m) => s + m.amt, 0),
    days,
    masters: masters
      .map((m) => {
        const mine = repairs.filter((r) => r.masterId === m.id);
        const done = mine.filter((r) => r.status === 'done');
        const dToday = done.filter((r) => doneAt(r) >= t0);
        const dMonth = done.filter((r) => doneAt(r) >= m0);
        return {
          id: m.id,
          name: m.name,
          branch: m.branch,
          active: m.active,
          outcall: !!m.outcall,
          rating: m.rating ?? 0,
          panel: false,
          hasAccount: false,
          todayDone: dToday.length,
          monthDone: dMonth.length,
          totalDone: done.length,
          todaySum: dToday.reduce((s, r) => s + (r.price ?? 0), 0),
          monthSum: dMonth.reduce((s, r) => s + (r.price ?? 0), 0),
          monthOutcalls: dMonth.filter((r) => r.outcall).length,
          activeNow: mine.filter((r) => r.status === 'accepted' || r.status === 'in_progress').length,
          monthCancelled: mine.filter((r) => r.status === 'cancelled' && new Date(r.updatedAt ?? r.createdAt).getTime() >= m0).length,
        };
      })
      .sort((a, b) => b.monthDone - a.monthDone || a.name.localeCompare(b.name)),
    mastersCount: { total: masters.length, active: masters.filter((m) => m.active).length, panel: 0, outcall: masters.filter((m) => m.active && m.outcall).length },
    repairsToday: {
      new: repairs.filter((r) => r.status === 'new').length,
      active: repairs.filter((r) => r.status === 'accepted' || r.status === 'in_progress').length,
      done: repairs.filter((r) => r.status === 'done' && doneAt(r) >= t0).length,
    },
    unassignedDone: {
      count: repairs.filter((r) => r.status === 'done' && doneAt(r) >= m0 && !r.masterId).length,
      noPrice: repairs.filter((r) => r.status === 'done' && doneAt(r) >= m0 && r.price == null).length,
    },
  };
}

export async function fetchOverview(): Promise<Overview> {
  if (!supabase) return localOverview();
  const { data, error } = await supabase.rpc('admin_overview');
  if (error) throw error;
  return data as Overview;
}
