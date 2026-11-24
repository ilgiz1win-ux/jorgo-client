import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Ижара берүүчүнүн (Арендодатель) реквизиттери — келишимде жазылат. settings таблицасында key = 'lessor'.
export type Lessor = { name: string; inn: string; address: string; phone: string; city: string };
export const DEFAULT_LESSOR: Lessor = { name: 'Jorgo Eco Service', inn: '', address: '', phone: '', city: 'г. Бишкек' };
const LOCAL = 'jorgo.local.lessor';

export async function getLessor(): Promise<Lessor> {
  try {
    if (!supabase) {
      const v = await AsyncStorage.getItem(LOCAL);
      return { ...DEFAULT_LESSOR, ...(v ? (JSON.parse(v) as Partial<Lessor>) : {}) };
    }
    const { data } = await supabase.from('settings').select('value').eq('key', 'lessor').maybeSingle();
    return { ...DEFAULT_LESSOR, ...((data?.value as Partial<Lessor>) ?? {}) };
  } catch {
    return DEFAULT_LESSOR;
  }
}

export async function saveLessor(l: Lessor): Promise<void> {
  const clean: Lessor = { name: l.name.trim().slice(0, 120), inn: l.inn.trim().slice(0, 20), address: l.address.trim().slice(0, 200), phone: l.phone.trim().slice(0, 40), city: l.city.trim().slice(0, 40) || DEFAULT_LESSOR.city };
  if (!supabase) {
    await AsyncStorage.setItem(LOCAL, JSON.stringify(clean)).catch(() => {});
    return;
  }
  const { error } = await supabase.from('settings').upsert({ key: 'lessor', value: clean });
  if (error) throw error;
}
