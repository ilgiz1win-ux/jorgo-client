import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import type { RentPeriod } from '../data/rentals';
import { supabase } from './supabase';

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

export async function submitRentRequest(r: Omit<RentRequest, 'id' | 'createdAt' | 'status'>): Promise<void> {
  if (!supabase) {
    const list = await readLocal();
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
  });
  if (error) throw error;
}

export async function fetchRentRequests(): Promise<RentRequest[]> {
  if (!supabase) return readLocal();
  const { data, error } = await supabase.from('rental_requests').select('*').order('created_at', { ascending: false }).limit(200);
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

export const mapLink = (lat: number, lng: number) => `https://maps.google.com/?q=${lat},${lng}`;
