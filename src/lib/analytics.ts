import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Жөнөкөй анонимдүү статистика: канча адам кирди, эмнени карады, канча буйрутма жөнөттү.
// Аты, телефону же башка жеке маалымат жазылбайт — ар бир түзмөккө кокус ID гана берилет.

export type EventType = 'visit' | 'product_view' | 'order' | 'repair' | 'rent';
type PlatformName = 'web' | 'pwa' | 'android' | 'ios';

const VISITOR_KEY = 'jorgo.vid';
const ADMIN_KEY = 'jorgo.isAdmin';

let visitorPromise: Promise<string> | null = null;
let isAdminDevice: boolean | null = null;

function randomId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 20; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function visitorId() {
  if (!visitorPromise) {
    visitorPromise = (async () => {
      try {
        const v = await AsyncStorage.getItem(VISITOR_KEY);
        if (v) return v;
        const id = randomId();
        await AsyncStorage.setItem(VISITOR_KEY, id);
        return id;
      } catch {
        return randomId();
      }
    })();
  }
  return visitorPromise;
}

function platform(): PlatformName {
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'ios') return 'ios';
  try {
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return standalone ? 'pwa' : 'web';
  } catch {
    return 'web';
  }
}

// Админ кирген түзмөк статистиканы бузбасын
export async function markAdminDevice() {
  isAdminDevice = true;
  try {
    await AsyncStorage.setItem(ADMIN_KEY, '1');
  } catch {}
}

async function adminDevice() {
  if (isAdminDevice === null) {
    try {
      isAdminDevice = (await AsyncStorage.getItem(ADMIN_KEY)) === '1';
    } catch {
      isAdminDevice = false;
    }
  }
  return isAdminDevice;
}

// Окуяны жазат. Ката болсо (интернет жок ж.б.) колдонмого таасир этпейт.
export async function track(type: EventType, productId?: string) {
  if (!supabase) return;
  try {
    if (await adminDevice()) return;
    const visitor = await visitorId();
    await supabase.from('events').insert({ type, visitor, product_id: productId ?? null, platform: platform() });
  } catch {}
}

export type Stats = {
  today_visitors: number;
  today_views: number;
  yesterday_visitors: number;
  period_visitors: number;
  orders: number;
  repairs: number;
  rents?: number;
  daily: { day: string; visitors: number }[];
  top_products: { id: string; views: number }[];
  platforms: Partial<Record<PlatformName, number>>;
};

export async function fetchStats(days: number): Promise<Stats> {
  if (!supabase) throw new Error('demo');
  const { data, error } = await supabase.rpc('admin_stats', { p_days: days });
  if (error) throw error;
  return data as Stats;
}
