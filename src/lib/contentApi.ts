import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS, GalleryItem, Review, SiteSettings } from '../data/content';
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

function listTable<T extends { id: string }, Row extends { id: string }>(opts: {
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
