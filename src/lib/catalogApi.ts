import AsyncStorage from '@react-native-async-storage/async-storage';
import { IMAGES_BUCKET } from '../config/backend';
import { CategoryId, DEFAULT_PROMOS, IconName, Product, PRODUCTS, Promo } from '../data/products';
import { RepairService, SERVICES } from '../data/services';
import { supabase } from './supabase';

// Товарлар жана акциялар менен иштөө. Supabase туташса — сервер,
// болбосо — түзмөктүн ичиндеги жергиликтүү сактагыч.

const LOCAL_PRODUCTS = 'jorgo.local.products';
const LOCAL_PROMOS = 'jorgo.local.promos';
const LOCAL_SERVICES = 'jorgo.local.services';
const CACHE_SERVICES = 'jorgo.cache.services';
const CACHE_PRODUCTS = 'jorgo.cache.products';
const CACHE_PROMOS = 'jorgo.cache.promos';

type ProductRow = {
  id: string;
  name: string;
  category: string;
  price: number;
  old_price: number | null;
  icon: string;
  image_url: string | null;
  description: string;
  specs: [string, string][] | null;
  in_stock: boolean;
  popular: boolean;
  sort?: number | null;
};

type PromoRow = { id: string; title: string; text: string; color: string; image_url: string | null; active: boolean; sort?: number | null };

const promoFromRow = (r: PromoRow): Promo => ({
  id: r.id,
  title: r.title,
  text: r.text ?? '',
  color: r.color,
  imageUrl: r.image_url ?? undefined,
  active: r.active,
});

const promoToRow = (p: Promo): PromoRow => ({
  id: p.id,
  title: p.title,
  text: p.text,
  color: p.color,
  image_url: p.imageUrl ?? null,
  active: p.active,
});

const fromRow = (r: ProductRow): Product => ({
  id: r.id,
  name: r.name,
  category: r.category as CategoryId,
  price: r.price,
  oldPrice: r.old_price ?? undefined,
  icon: (r.icon || 'package-variant') as IconName,
  imageUrl: r.image_url ?? undefined,
  description: r.description ?? '',
  specs: r.specs ?? [],
  inStock: r.in_stock,
  popular: r.popular,
});

// sort берилбесе, сервердеги иреттик өзгөрбөйт
const toRow = (p: Product, sort?: number): ProductRow => ({
  id: p.id,
  name: p.name,
  category: p.category,
  price: p.price,
  old_price: p.oldPrice ?? null,
  icon: p.icon,
  image_url: p.imageUrl ?? null,
  description: p.description,
  specs: p.specs,
  in_stock: p.inStock,
  popular: !!p.popular,
  ...(sort !== undefined && { sort }),
});

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

// ---------- Товарлар ----------

export async function fetchProducts(): Promise<Product[]> {
  if (!supabase) return (await readJson<Product[]>(LOCAL_PRODUCTS)) ?? PRODUCTS;
  try {
    const { data, error } = await supabase.from('products').select('*').order('sort').order('name');
    if (error) throw error;
    const list = (data as ProductRow[]).map(fromRow);
    writeJson(CACHE_PRODUCTS, list);
    return list;
  } catch {
    // Интернет жок болсо — акыркы жүктөлгөн тизме
    return (await readJson<Product[]>(CACHE_PRODUCTS)) ?? PRODUCTS;
  }
}

export async function saveProduct(p: Product, all: Product[]): Promise<Product[]> {
  const exists = all.some((x) => x.id === p.id);
  const next = exists ? all.map((x) => (x.id === p.id ? p : x)) : [p, ...all];
  if (supabase) {
    const { error } = await supabase.from('products').upsert(toRow(p, exists ? undefined : 0));
    if (error) throw error;
  } else {
    await writeJson(LOCAL_PRODUCTS, next);
  }
  return next;
}

export async function deleteProduct(id: string, all: Product[]): Promise<Product[]> {
  const next = all.filter((x) => x.id !== id);
  if (supabase) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  } else {
    await writeJson(LOCAL_PRODUCTS, next);
  }
  return next;
}

// Мисал товарларды серверге бир жолу жүктөө (база бош болгондо).
export async function seedProducts(): Promise<Product[]> {
  if (supabase) {
    const { error } = await supabase.from('products').upsert(PRODUCTS.map((p, i) => toRow(p, i)));
    if (error) throw error;
  } else {
    await writeJson(LOCAL_PRODUCTS, PRODUCTS);
  }
  return PRODUCTS;
}

// ---------- Акциялар ----------

export async function fetchPromos(): Promise<Promo[]> {
  if (!supabase) return (await readJson<Promo[]>(LOCAL_PROMOS)) ?? DEFAULT_PROMOS;
  try {
    const { data, error } = await supabase.from('promos').select('*').order('sort').order('title');
    if (error) throw error;
    const list = (data as PromoRow[]).map(promoFromRow);
    writeJson(CACHE_PROMOS, list);
    return list;
  } catch {
    return (await readJson<Promo[]>(CACHE_PROMOS)) ?? [];
  }
}

export async function savePromo(p: Promo, all: Promo[]): Promise<Promo[]> {
  const exists = all.some((x) => x.id === p.id);
  const next = exists ? all.map((x) => (x.id === p.id ? p : x)) : [...all, p];
  if (supabase) {
    const { error } = await supabase.from('promos').upsert(promoToRow(p));
    if (error) throw error;
  } else {
    await writeJson(LOCAL_PROMOS, next);
  }
  return next;
}

export async function deletePromo(id: string, all: Promo[]): Promise<Promo[]> {
  const next = all.filter((x) => x.id !== id);
  if (supabase) {
    const { error } = await supabase.from('promos').delete().eq('id', id);
    if (error) throw error;
  } else {
    await writeJson(LOCAL_PROMOS, next);
  }
  return next;
}

// ---------- Оңдоо кызматтары ----------

type ServiceRow = { id: string; title: string; price: string; icon: string; sort?: number };

const serviceFromRow = (r: ServiceRow): RepairService => ({
  id: r.id,
  title: r.title,
  price: r.price ?? '',
  icon: (r.icon || 'wrench') as IconName,
});

export async function fetchServices(): Promise<RepairService[]> {
  if (!supabase) return (await readJson<RepairService[]>(LOCAL_SERVICES)) ?? SERVICES;
  try {
    const { data, error } = await supabase.from('services').select('*').order('sort').order('title');
    if (error) throw error;
    const list = (data as ServiceRow[]).map(serviceFromRow);
    writeJson(CACHE_SERVICES, list);
    return list;
  } catch {
    // Таблица али түзүлө элек же интернет жок — акыркы тизме же баштапкы кызматтар
    return (await readJson<RepairService[]>(CACHE_SERVICES)) ?? SERVICES;
  }
}

export async function saveService(sv: RepairService, all: RepairService[]): Promise<RepairService[]> {
  const idx = all.findIndex((x) => x.id === sv.id);
  const next = idx >= 0 ? all.map((x) => (x.id === sv.id ? sv : x)) : [...all, sv];
  if (supabase) {
    const row: ServiceRow = { id: sv.id, title: sv.title, price: sv.price, icon: sv.icon, sort: idx >= 0 ? idx : next.length - 1 };
    const { error } = await supabase.from('services').upsert(row);
    if (error) throw error;
  } else {
    await writeJson(LOCAL_SERVICES, next);
  }
  return next;
}

export async function deleteService(id: string, all: RepairService[]): Promise<RepairService[]> {
  const next = all.filter((x) => x.id !== id);
  if (supabase) {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) throw error;
  } else {
    await writeJson(LOCAL_SERVICES, next);
  }
  return next;
}

// ---------- Сүрөттөр ----------

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Тандалган сүрөттү жүктөйт жана анын шилтемесин кайтарат.
export async function uploadImage(base64: string, mimeType = 'image/jpeg'): Promise<string> {
  if (!supabase) return `data:${mimeType};base64,${base64}`;
  const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(IMAGES_BUCKET).upload(path, base64ToBytes(base64), { contentType: mimeType });
  if (error) throw error;
  return supabase.storage.from(IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
}

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
