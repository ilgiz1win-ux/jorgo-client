import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import type { RentPeriod } from '../data/rentals';
import { supabase } from './supabase';
import { RENT_MIN_DAYS } from '../data/rentals';
import { localBalanceOf, localWalletAdd } from './wallet';

// Ижарага өтүнмөлөр: паспорт, телефон, GPS. Кардар жазат, окуу — админ гана (RLS).

export type RentStatus = 'new' | 'active' | 'returned' | 'rejected';

export type RentRequest = {
  id: string;
  createdAt: string;
  bikeId: string;
  bikeName: string;
  period: RentPeriod;
  count: number;
  total?: number;
  startText: string;
  name: string;
  phone: string;
  passport: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
  status: RentStatus;
  // Аккаунт аркылуу жиберилсе
  userId?: string;
  // Ижара ушул күнгө чейин төлөнгөн (YYYY-MM-DD)
  paidUntil?: string;
  // Жаңы тартип: баланстан күн сайын
  billing?: boolean;
  dailyPrice?: number;
  startedAt?: string;
  chargedDays?: number;
  returnedAt?: string;
  dmgElectronics?: number;
  dmgMechanics?: number;
  dmgLost?: number;
  batterySwapped?: boolean;
  damageCharged?: number;
  returnNote?: string;
  // Келишим (админ велосипедди бергенде толтурат)
  contractNo?: number;
  bikeNo?: string;
  jorgoNo?: string;
  batteryNo?: string;
  bikeValue?: number;
  deposit?: number;
  collateral?: string;
  kit?: string[];
  // Кабыл алуу-өткөрүп берүү акты
  handoverDefects?: '' | 'none' | 'scratches';
  handoverNote?: string;
  handoverOk?: boolean;
  staffName?: string;
};

type Row = {
  id: string;
  created_at: string;
  bike_id: string;
  bike_name: string;
  period: RentPeriod;
  count: number;
  total: number | null;
  start_text: string;
  name: string;
  phone: string;
  passport: string;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  status: RentStatus;
  user_id?: string | null;
  paid_until?: string | null;
  billing?: boolean;
  daily_price?: number | null;
  started_at?: string | null;
  charged_days?: number;
  returned_at?: string | null;
  dmg_electronics?: number;
  dmg_mechanics?: number;
  dmg_lost?: number;
  battery_swapped?: boolean;
  damage_charged?: number;
  return_note?: string;
  contract_no?: number | null;
  bike_no?: string;
  jorgo_no?: string;
  battery_no?: string;
  bike_value?: number | null;
  deposit?: number | null;
  collateral?: string;
  kit?: string[] | null;
  handover_defects?: '' | 'none' | 'scratches';
  handover_note?: string;
  handover_ok?: boolean;
  staff_name?: string;
};

const LOCAL = 'jorgo.local.rentRequests';

const fromRow = (r: Row): RentRequest => ({
  id: r.id,
  createdAt: r.created_at,
  bikeId: r.bike_id,
  bikeName: r.bike_name,
  period: r.period,
  count: r.count,
  total: r.total ?? undefined,
  startText: r.start_text ?? '',
  name: r.name,
  phone: r.phone,
  passport: r.passport,
  lat: r.lat ?? undefined,
  lng: r.lng ?? undefined,
  accuracy: r.accuracy ?? undefined,
  status: r.status,
  userId: r.user_id ?? undefined,
  paidUntil: r.paid_until ?? undefined,
  billing: r.billing ?? false,
  dailyPrice: r.daily_price ?? undefined,
  startedAt: r.started_at ?? undefined,
  chargedDays: r.charged_days ?? 0,
  returnedAt: r.returned_at ?? undefined,
  dmgElectronics: r.dmg_electronics ?? 0,
  dmgMechanics: r.dmg_mechanics ?? 0,
  dmgLost: r.dmg_lost ?? 0,
  batterySwapped: r.battery_swapped ?? false,
  damageCharged: r.damage_charged ?? 0,
  returnNote: r.return_note ?? '',
  contractNo: r.contract_no ?? undefined,
  bikeNo: r.bike_no ?? '',
  jorgoNo: r.jorgo_no ?? '',
  batteryNo: r.battery_no ?? '',
  bikeValue: r.bike_value ?? undefined,
  deposit: r.deposit ?? undefined,
  collateral: r.collateral ?? '',
  kit: Array.isArray(r.kit) ? r.kit : [],
  handoverDefects: r.handover_defects ?? '',
  handoverNote: r.handover_note ?? '',
  handoverOk: r.handover_ok ?? true,
  staffName: r.staff_name ?? '',
});

async function readLocal(): Promise<RentRequest[]> {
  try {
    const v = await AsyncStorage.getItem(LOCAL);
    return v ? JSON.parse(v) : [];
  } catch {
    return [];
  }
}

// Телефондон бир жолу жайгашкан жерди алат (кардар уруксат берсе). Болбосо null.
export async function getLocationOnce(): Promise<{ lat: number; lng: number; accuracy?: number } | null> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return null;
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<null>((r) => setTimeout(() => r(null), 15000)),
    ]);
    if (!pos) return null;
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? undefined };
  } catch {
    return null;
  }
}

// Каталар: 'rent_low_balance' (баланста бир жумалык акча жок), 'rent_login_required', 'rent_no_price'
export async function submitRentRequest(r: Omit<RentRequest, 'id' | 'createdAt' | 'status'>): Promise<void> {
  if (!supabase) {
    const list = await readLocal();
    if (r.dailyPrice && r.userId) {
      if ((await localBalanceOf(r.userId)) < r.dailyPrice * RENT_MIN_DAYS) throw new Error('rent_low_balance');
      r = { ...r, billing: true, period: 'day', count: RENT_MIN_DAYS, total: r.dailyPrice * RENT_MIN_DAYS, chargedDays: 0 };
    }
    list.unshift({ ...r, id: String(Date.now()), createdAt: new Date().toISOString(), status: 'new' });
    await AsyncStorage.setItem(LOCAL, JSON.stringify(list)).catch(() => {});
    return;
  }
  const { error } = await supabase.from('rental_requests').insert({
    bike_id: r.bikeId,
    bike_name: r.bikeName,
    period: r.period,
    count: r.count,
    total: r.total ?? null,
    start_text: r.startText,
    name: r.name,
    phone: r.phone,
    passport: r.passport,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    accuracy: r.accuracy ?? null,
    // user_id серверде auth.uid() менен автоматтык коюлат; күндүк баа жана баланс серверде текшерилет
  });
  if (error) {
    const m = /rent_low_balance|rent_login_required|rent_no_price/.exec(error.message);
    throw new Error(m ? m[0] : error.message);
  }
}

// ---------- Жаңы тартип: баланстан күн сайын ----------
const dayStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysBetween = (fromIso: string) => {
  const a = new Date(new Date(fromIso).toDateString()).getTime();
  const b = new Date(new Date().toDateString()).getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
};
// Демо: күнүмдүк акыны алуу (серверде pg_cron жасайт)
async function localBill(list: RentRequest[]): Promise<RentRequest[]> {
  let changed = false;
  for (const r of list) {
    if (!r.billing || r.status !== 'active' || !r.startedAt || !r.userId || !r.dailyPrice) continue;
    const due = daysBetween(r.startedAt);
    while ((r.chargedDays ?? 0) < due) {
      r.chargedDays = (r.chargedDays ?? 0) + 1;
      const d = new Date(r.startedAt);
      d.setDate(d.getDate() + r.chargedDays);
      await localWalletAdd(r.userId, -r.dailyPrice, 'rent', `${r.bikeName} · ${dayStr(d).slice(5).split('-').reverse().join('.')}`);
      changed = true;
    }
  }
  if (changed) await AsyncStorage.setItem(LOCAL, JSON.stringify(list)).catch(() => {});
  return list;
}

export type ContractDetails = { bikeNo: string; jorgoNo: string; batteryNo: string; bikeValue?: number; deposit?: number; collateral: string; kit: string[]; defects?: 'none' | 'scratches'; handoverNote?: string; handoverOk?: boolean; staff?: string };

// Админ: велосипедди берди — ижара башталды (бүгүн акысыз), келишимдин маалыматы менен. Келишимдин номерин кайтарат.
export async function startRent(id: string, d?: ContractDetails): Promise<number | null> {
  if (!supabase) {
    const list = await readLocal();
    const no = list.reduce((m, x) => Math.max(m, x.contractNo ?? 0), 0) + 1;
    const next = list.map((x) => (x.id === id && x.status === 'new' ? { ...x, status: 'active' as const, startedAt: new Date().toISOString(), chargedDays: 0, contractNo: no, ...(d ?? {}), handoverDefects: d?.defects ?? '', staffName: d?.staff ?? '' } : x));
    await AsyncStorage.setItem(LOCAL, JSON.stringify(next)).catch(() => {});
    return no;
  }
  const { data, error } = await supabase.rpc('admin_rent_start', {
    p_id: id,
    p_details: d ? { ...d, bikeValue: d.bikeValue ?? '', deposit: d.deposit ?? '' } : {},
  });
  if (error) throw error;
  return (data as number | null) ?? null;
}

// Админ: кайтарылды — минимум 1 жума жана зыян (электроника 50%, механика 100%, жоголгон 100%) балансынан алынат
export async function returnRent(id: string, d: { electronics: number; mechanics: number; lost: number; battery: boolean; note: string }): Promise<number> {
  if (!supabase) {
    const list = await localBill(await readLocal());
    const r = list.find((x) => x.id === id);
    if (!r || r.status !== 'active') return 0;
    let extra = 0;
    if (r.billing && r.userId && r.dailyPrice && (r.chargedDays ?? 0) < RENT_MIN_DAYS) {
      const rest = RENT_MIN_DAYS - (r.chargedDays ?? 0);
      extra = rest * r.dailyPrice;
      await localWalletAdd(r.userId, -extra, 'rent', `${r.bikeName} · минимум ${RENT_MIN_DAYS} күн (${rest} күн)`);
      r.chargedDays = RENT_MIN_DAYS;
    }
    const dmg = Math.round(d.electronics * 0.5) + d.mechanics + d.lost;
    if (dmg > 0 && r.userId) await localWalletAdd(r.userId, -dmg, 'damage', `Зыян: ${r.bikeName}`);
    Object.assign(r, { status: 'returned', returnedAt: new Date().toISOString(), dmgElectronics: d.electronics, dmgMechanics: d.mechanics, dmgLost: d.lost, batterySwapped: d.battery, damageCharged: dmg, returnNote: d.note });
    await AsyncStorage.setItem(LOCAL, JSON.stringify(list)).catch(() => {});
    return dmg + extra;
  }
  const { data, error } = await supabase.rpc('admin_rent_return', { p_id: id, p_electronics: d.electronics, p_mechanics: d.mechanics, p_lost: d.lost, p_battery: d.battery, p_note: d.note });
  if (error) throw error;
  return Number(data) || 0;
}

export async function fetchRentRequests(): Promise<RentRequest[]> {
  if (!supabase) return localBill(await readLocal());
  const { data, error } = await supabase.from('rental_requests').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

// Кардардын өз өтүнмөлөрү (RLS башка кардардыкын бербейт)
export async function fetchMyRentRequests(userId: string): Promise<RentRequest[]> {
  if (!supabase) return (await localBill(await readLocal())).filter((r) => r.userId === userId);
  const { data, error } = await supabase.from('rental_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function setRentStatus(id: string, status: RentStatus): Promise<void> {
  if (!supabase) {
    const list = (await readLocal()).map((x) => (x.id === id ? { ...x, status } : x));
    await AsyncStorage.setItem(LOCAL, JSON.stringify(list)).catch(() => {});
    return;
  }
  const { error } = await supabase.from('rental_requests').update({ status }).eq('id', id);
  if (error) throw error;
}

// Демо режим үчүн: төлөнгөн мөөнөттү жергиликтүү жаңыртуу
export async function setLocalPaidUntil(id: string, paidUntil: string): Promise<void> {
  if (supabase) return;
  const list = (await readLocal()).map((x) => (x.id === id ? { ...x, paidUntil, status: x.status === 'new' ? ('active' as const) : x.status } : x));
  await AsyncStorage.setItem(LOCAL, JSON.stringify(list)).catch(() => {});
}

export const mapLink = (lat: number, lng: number) => `https://maps.google.com/?q=${lat},${lng}`;
