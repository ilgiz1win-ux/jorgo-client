import AsyncStorage from '@react-native-async-storage/async-storage';
import { Branch, DEFAULT_SETTINGS, Express, GalleryItem, Master, Review, SiteSettings } from '../data/content';
import { SHOP } from '../config/shop';
import { DEFAULT_RENT_TERMS, DEMO_RENTALS, RentalBike, RentTerms } from '../data/rentals';
import { supabase } from './supabase';

// Башкы беттин жөндөөлөрү, пикирлер жана галерея.
// Supabase туташса — сервер, болбосо — түзмөктүн ичи (демо режим).

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const v = await AsyncStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ---------- Жөндөөлөр (бир сап: key = 'site') ----------

const SETTINGS_LOCAL = 'jorgo.local.settings';
const SETTINGS_CACHE = 'jorgo.cache.settings';

const withDefaults = (s: Partial<SiteSettings> | null): SiteSettings => ({
  ...DEFAULT_SETTINGS,
  ...(s ?? {}),
  stats: s?.stats?.length ? s.stats : DEFAULT_SETTINGS.stats,
});

export async function fetchSettings(): Promise<SiteSettings> {
  if (!supabase) return withDefaults(await readJson<SiteSettings>(SETTINGS_LOCAL));
  try {
    const { data, error } = await supabase.from('settings').select('value').eq('key', 'site').maybeSingle();
    if (error) throw error;
    const s = withDefaults((data?.value as SiteSettings) ?? null);
    writeJson(SETTINGS_CACHE, s);
    return s;
  } catch {
    return withDefaults(await readJson<SiteSettings>(SETTINGS_CACHE));
  }
}

export async function saveSettings(s: SiteSettings): Promise<SiteSettings> {
  if (supabase) {
    const { error } = await supabase.from('settings').upsert({ key: 'site', value: s });
    if (error) throw error;
  } else {
    await writeJson(SETTINGS_LOCAL, s);
  }
  return s;
}

// ---------- Жөнөкөй тизмелер (пикирлер, галерея) ----------

export function listTable<T extends { id: string }, Row extends { id: string }>(opts: {
  table: string;
  localKey: string;
  cacheKey: string;
  fromRow: (r: Row) => T;
  toRow: (t: T, sort: number) => Row;
}) {
  const { table, localKey, cacheKey, fromRow, toRow } = opts;
  return {
    async fetch(): Promise<T[]> {
      if (!supabase) return (await readJson<T[]>(localKey)) ?? [];
      try {
        const { data, error } = await supabase.from(table).select('*').order('sort');
        if (error) throw error;
        const list = (data as Row[]).map(fromRow);
        writeJson(cacheKey, list);
        return list;
      } catch {
        return (await readJson<T[]>(cacheKey)) ?? [];
      }
    },
    async save(item: T, all: T[]): Promise<T[]> {
      const idx = all.findIndex((x) => x.id === item.id);
      const next = idx >= 0 ? all.map((x) => (x.id === item.id ? item : x)) : [...all, item];
      if (supabase) {
        const { error } = await supabase.from(table).upsert(toRow(item, idx >= 0 ? idx : next.length - 1));
        if (error) throw error;
      } else {
        await writeJson(localKey, next);
      }
      return next;
    },
    async remove(id: string, all: T[]): Promise<T[]> {
      const next = all.filter((x) => x.id !== id);
      if (supabase) {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
      } else {
        await writeJson(localKey, next);
      }
      return next;
    },
  };
}

type ReviewRow = { id: string; name: string; text: string; rating: number; sort: number };
export const reviewsApi = listTable<Review, ReviewRow>({
  table: 'reviews',
  localKey: 'jorgo.local.reviews',
  cacheKey: 'jorgo.cache.reviews',
  fromRow: (r) => ({ id: r.id, name: r.name, text: r.text ?? '', rating: Math.min(5, Math.max(1, r.rating || 5)) }),
  toRow: (r, sort) => ({ id: r.id, name: r.name, text: r.text, rating: r.rating, sort }),
});

type GalleryRow = { id: string; title: string; before_url: string | null; after_url: string | null; sort: number };
export const galleryApi = listTable<GalleryItem, GalleryRow>({
  table: 'gallery',
  localKey: 'jorgo.local.gallery',
  cacheKey: 'jorgo.cache.gallery',
  fromRow: (r) => ({ id: r.id, title: r.title ?? '', beforeUrl: r.before_url ?? undefined, afterUrl: r.after_url ?? undefined }),
  toRow: (g, sort) => ({ id: g.id, title: g.title, before_url: g.beforeUrl ?? null, after_url: g.afterUrl ?? null, sort }),
});

type MasterRow = {
  id: string;
  name: string;
  photo_url: string | null;
  specialty: string;
  experience: string;
  branch: string;
  active: boolean;
  rating: number | string | null;
  orders: number | null;
  hours_from: string | null;
  hours_to: string | null;
  outcall: boolean | null;
  outcall_note: string | null;
  sort: number;
};
export const mastersApi = listTable<Master, MasterRow>({
  table: 'masters',
  localKey: 'jorgo.local.masters',
  cacheKey: 'jorgo.cache.masters',
  fromRow: (r) => ({
    id: r.id,
    name: r.name,
    photoUrl: r.photo_url ?? undefined,
    specialty: r.specialty ?? '',
    experience: r.experience ?? '',
    branch: r.branch ?? '',
    active: r.active,
    rating: r.rating == null ? 5 : Number(r.rating),
    orders: r.orders ?? 0,
    hoursFrom: r.hours_from ?? '',
    hoursTo: r.hours_to ?? '',
    outcall: !!r.outcall,
    outcallNote: r.outcall_note ?? '',
  }),
  toRow: (m, sort) => ({
    id: m.id,
    name: m.name,
    photo_url: m.photoUrl ?? null,
    specialty: m.specialty,
    experience: m.experience,
    branch: m.branch,
    active: m.active,
    rating: Math.min(5, Math.max(0, Math.round(m.rating * 10) / 10)),
    orders: Math.max(0, Math.round(m.orders)),
    hours_from: m.hoursFrom,
    hours_to: m.hoursTo,
    outcall: m.outcall,
    outcall_note: m.outcallNote,
    sort,
  }),
});

// Демо режим үчүн гана мисалдар (сервер туташканда көрсөтүлбөйт)
const DEMO_MASTERS: Master[] = [
  { id: 'demo-m1', name: 'Азамат', specialty: 'Мотор жана контроллер', experience: '7 жыл', branch: 'Фучика көч., 62а', active: true, rating: 4.9, orders: 148, hoursFrom: '09:00', hoursTo: '18:00', outcall: true, outcallNote: '18:00–22:00, 500 сомдон' },
  { id: 'demo-m2', name: 'Бекзат', specialty: 'Батарея жана заряд', experience: '4 жыл', branch: 'Манас пр., 2а', active: true, rating: 4.7, orders: 63, hoursFrom: '10:00', hoursTo: '19:00', outcall: false, outcallNote: '' },
];

// SQL (011) иштетиле элек болсо, бош тизме
export async function fetchMasters(): Promise<Master[]> {
  try {
    const list = await mastersApi.fetch();
    if (!supabase && list.length === 0 && (await readJson<Master[]>('jorgo.local.masters')) === null) return DEMO_MASTERS;
    return list;
  } catch {
    return [];
  }
}

// ---------- Ижара (аренда) ----------

type RentalRow = {
  id: string;
  name: string;
  image_url: string | null;
  description: string;
  specs: [string, string][] | null;
  price_day: number | null;
  price_week: number | null;
  price_month: number | null;
  deposit: number | null;
  available: boolean;
  sort: number;
};
export const rentalsApi = listTable<RentalBike, RentalRow>({
  table: 'rentals',
  localKey: 'jorgo.local.rentals',
  cacheKey: 'jorgo.cache.rentals',
  fromRow: (r) => ({
    id: r.id,
    name: r.name,
    imageUrl: r.image_url ?? undefined,
    description: r.description ?? '',
    specs: r.specs ?? [],
    priceDay: r.price_day ?? undefined,
    priceWeek: r.price_week ?? undefined,
    priceMonth: r.price_month ?? undefined,
    deposit: r.deposit ?? undefined,
    available: r.available,
  }),
  toRow: (b, sort) => ({
    id: b.id,
    name: b.name,
    image_url: b.imageUrl ?? null,
    description: b.description,
    specs: b.specs,
    price_day: b.priceDay ?? null,
    price_week: b.priceWeek ?? null,
    price_month: b.priceMonth ?? null,
    deposit: b.deposit ?? null,
    available: b.available,
    sort,
  }),
});

// Демо режимде (сервер жок) бош болсо мисалды көрсөтөбүз
export async function fetchRentals(): Promise<RentalBike[]> {
  const list = await rentalsApi.fetch();
  if (supabase) return list;
  // Демо: ижарада жүргөн велосипед «Ижарада» деп көрүнөт (серверде муну 032 триггери кылат)
  const base = list.length === 0 && (await readJson<RentalBike[]>('jorgo.local.rentals')) === null ? DEMO_RENTALS : list;
  const busy = new Set(((await readJson<{ bikeId: string; status: string }[]>('jorgo.local.rentRequests')) ?? []).filter((r) => r.status === 'active').map((r) => r.bikeId));
  return busy.size ? base.map((b) => (busy.has(b.id) ? { ...b, available: false } : b)) : base;
}

// Ижаранын шарттары: settings таблицасында key = 'rent'
const RENT_LOCAL = 'jorgo.local.rentTerms';
const RENT_CACHE = 'jorgo.cache.rentTerms';

export async function fetchRentTerms(): Promise<RentTerms> {
  if (!supabase) return (await readJson<RentTerms>(RENT_LOCAL)) ?? DEFAULT_RENT_TERMS;
  try {
    const { data, error } = await supabase.from('settings').select('value').eq('key', 'rent').maybeSingle();
    if (error) throw error;
    const t = { ...DEFAULT_RENT_TERMS, ...((data?.value as RentTerms) ?? {}) };
    writeJson(RENT_CACHE, t);
    return t;
  } catch {
    return (await readJson<RentTerms>(RENT_CACHE)) ?? DEFAULT_RENT_TERMS;
  }
}

export async function saveRentTerms(t: RentTerms): Promise<RentTerms> {
  if (supabase) {
    const { error } = await supabase.from('settings').upsert({ key: 'rent', value: t });
    if (error) throw error;
  } else {
    await writeJson(RENT_LOCAL, t);
  }
  return t;
}

// Велосипеддин GPS жана батарея номерлери — админ гана (rental_equipment таблицасы, RLS)
export type Equipment = { gpsNo: string; battery1No: string; battery2No: string };
export const EMPTY_EQUIPMENT: Equipment = { gpsNo: '', battery1No: '', battery2No: '' };
const EQUIP_LOCAL = 'jorgo.local.equipment';

export async function fetchEquipment(): Promise<Record<string, Equipment>> {
  if (!supabase) return (await readJson<Record<string, Equipment>>(EQUIP_LOCAL)) ?? {};
  const { data, error } = await supabase.from('rental_equipment').select('*');
  if (error) throw error;
  return Object.fromEntries(
    (data as { rental_id: string; gps_no: string; battery1_no: string; battery2_no: string }[]).map((r) => [
      r.rental_id,
      { gpsNo: r.gps_no, battery1No: r.battery1_no, battery2No: r.battery2_no },
    ]),
  );
}

export async function saveEquipment(rentalId: string, e: Equipment): Promise<void> {
  const clean = { gpsNo: e.gpsNo.trim(), battery1No: e.battery1No.trim(), battery2No: e.battery2No.trim() };
  if (!supabase) {
    const all = (await readJson<Record<string, Equipment>>(EQUIP_LOCAL)) ?? {};
    all[rentalId] = clean;
    await writeJson(EQUIP_LOCAL, all);
    return;
  }
  const { error } = await supabase
    .from('rental_equipment')
    .upsert({ rental_id: rentalId, gps_no: clean.gpsNo, battery1_no: clean.battery1No, battery2_no: clean.battery2No, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ---------- Точкалар (settings, key = 'branches') ----------
const BRANCHES_LOCAL = 'jorgo.local.branches';
const BRANCHES_CACHE = 'jorgo.cache.branches';
export const DEFAULT_BRANCHES: Branch[] = SHOP.branches.map((name) => ({ name, whatsapp: SHOP.whatsapp }));

// "0700 123 456" / "+996 700 123 456" → "996700123456"
export function normalizeWhatsapp(input: string): string {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('0')) d = d.slice(1);
  if (d.length === 9) d = '996' + d;
  return d;
}

const cleanBranches = (list: unknown): Branch[] => {
  if (!Array.isArray(list)) return DEFAULT_BRANCHES;
  const out = list
    .filter((b): b is Branch => !!b && typeof (b as Branch).name === 'string')
    .map((b) => ({ name: b.name.trim(), whatsapp: normalizeWhatsapp(String(b.whatsapp ?? '')) || SHOP.whatsapp }))
    .filter((b) => b.name);
  return out.length ? out : DEFAULT_BRANCHES;
};

export async function fetchBranches(): Promise<Branch[]> {
  if (!supabase) return cleanBranches(await readJson<Branch[]>(BRANCHES_LOCAL));
  try {
    const { data, error } = await supabase.from('settings').select('value').eq('key', 'branches').maybeSingle();
    if (error) throw error;
    const list = cleanBranches(data?.value);
    writeJson(BRANCHES_CACHE, list);
    return list;
  } catch {
    return cleanBranches(await readJson<Branch[]>(BRANCHES_CACHE));
  }
}

export async function saveBranches(list: Branch[]): Promise<Branch[]> {
  const clean = cleanBranches(list);
  if (supabase) {
    const { error } = await supabase.from('settings').upsert({ key: 'branches', value: clean });
    if (error) throw error;
  } else {
    await writeJson(BRANCHES_LOCAL, clean);
  }
  return clean;
}

// ---------- Экспресс (settings, key = 'express') ----------
const EXPRESS_LOCAL = 'jorgo.local.express';
const EXPRESS_CACHE = 'jorgo.cache.express';
export const DEFAULT_EXPRESS: Express = { name: 'Экспресс', whatsapp: '' };

const cleanExpress = (v: unknown): Express => {
  const e = (v ?? {}) as Partial<Express>;
  return { name: String(e.name ?? '').trim() || DEFAULT_EXPRESS.name, whatsapp: normalizeWhatsapp(String(e.whatsapp ?? '')) };
};

export async function fetchExpress(): Promise<Express> {
  if (!supabase) return cleanExpress(await readJson<Express>(EXPRESS_LOCAL));
  try {
    const { data, error } = await supabase.from('settings').select('value').eq('key', 'express').maybeSingle();
    if (error) throw error;
    const e = cleanExpress(data?.value);
    writeJson(EXPRESS_CACHE, e);
    return e;
  } catch {
    return cleanExpress(await readJson<Express>(EXPRESS_CACHE));
  }
}

export async function saveExpress(e: Express): Promise<Express> {
  const clean = cleanExpress(e);
  if (supabase) {
    const { error } = await supabase.from('settings').upsert({ key: 'express', value: clean });
    if (error) throw error;
  } else {
    await writeJson(EXPRESS_LOCAL, clean);
  }
  return clean;
}
