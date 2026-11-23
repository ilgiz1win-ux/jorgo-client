import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Оңдоо өтүнмөлөрү (базада), мастердин панели, «мастер болом» өтүнмөлөрү
export type RepairStatus = 'new' | 'accepted' | 'in_progress' | 'done' | 'cancelled';
export type Repair = {
  id: string;
  createdAt: string;
  number: string;
  name: string;
  phone: string;
  bike: string;
  services: string[];
  problem: string;
  branch: string;
  masterId?: string;
  outcall: boolean;
  status: RepairStatus;
  masterNote: string;
};
type Row = {
  id: string;
  created_at: string;
  number: string;
  name: string;
  phone: string;
  bike: string;
  services: string[];
  problem: string;
  branch: string;
  master_id: string | null;
  outcall: boolean;
  status: RepairStatus;
  master_note: string;
};
const fromRow = (r: Row): Repair => ({
  id: r.id,
  createdAt: r.created_at,
  number: r.number,
  name: r.name,
  phone: r.phone,
  bike: r.bike,
  services: Array.isArray(r.services) ? r.services : [],
  problem: r.problem,
  branch: r.branch,
  masterId: r.master_id ?? undefined,
  outcall: r.outcall,
  status: r.status,
  masterNote: r.master_note,
});

const LOCAL = 'jorgo.local.repairs';
const LOCAL_LINKS = 'jorgo.local.masterLinks';
const LOCAL_APPS = 'jorgo.local.masterApps';
const read = async <T,>(k: string, d: T): Promise<T> => {
  try {
    const v = await AsyncStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
};
const write = (k: string, v: unknown) => AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {});

export async function createRepair(r: Omit<Repair, 'id' | 'createdAt' | 'status' | 'masterNote'>): Promise<'ok' | 'blocked' | 'error'> {
  if (!supabase) {
    const l = await read<Repair[]>(LOCAL, []);
    l.unshift({ ...r, id: String(Date.now()), createdAt: new Date().toISOString(), status: 'new', masterNote: '' });
    await write(LOCAL, l);
    return 'ok';
  }
  const { error } = await supabase.from('repair_requests').insert({
    number: r.number,
    name: r.name,
    phone: r.phone,
    bike: r.bike,
    services: r.services,
    problem: r.problem,
    branch: r.branch,
    master_id: r.masterId ?? null,
    outcall: r.outcall,
  });
  if (!error) return 'ok';
  if (error.code === '42501' || /row-level security/i.test(error.message)) return 'blocked';
  return 'error';
}

// Админ — баарын; мастер — өзүнүкүн жана өз точкасындагы мастери жоктарды (RLS чечет)
export async function fetchRepairs(): Promise<Repair[]> {
  if (!supabase) return read<Repair[]>(LOCAL, []);
  const { data, error } = await supabase.from('repair_requests').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function updateRepair(id: string, patch: { status?: RepairStatus; masterNote?: string; masterId?: string | null }): Promise<Repair | null> {
  if (!supabase) {
    const l = (await read<Repair[]>(LOCAL, [])).map((x) =>
      x.id === id
        ? { ...x, status: patch.status ?? x.status, masterNote: patch.masterNote ?? x.masterNote, masterId: patch.masterId === undefined ? x.masterId : patch.masterId ?? undefined }
        : x,
    );
    await write(LOCAL, l);
    return l.find((x) => x.id === id) ?? null;
  }
  const row: Record<string, unknown> = {};
  if (patch.status) row.status = patch.status;
  if (patch.masterNote !== undefined) row.master_note = patch.masterNote;
  if (patch.masterId !== undefined) row.master_id = patch.masterId;
  const { data, error } = await supabase.from('repair_requests').update(row).eq('id', id).select('*').single();
  if (error) throw error;
  return fromRow(data as Row);
}

// Кирген колдонуучу мастер болсо — анын мастер ID'си
export async function myMasterId(userId?: string): Promise<string | null> {
  if (!supabase) {
    if (!userId) return null;
    const links = await read<Record<string, string>>(LOCAL_LINKS, {});
    return Object.keys(links).find((m) => links[m] === userId) ?? null;
  }
  const { data, error } = await supabase.rpc('my_master_id');
  if (error) return null;
  return (data as string | null) ?? null;
}

// Админ: мастер → аккаунт (телефон же email). Бош — байланышты алып салуу.
export async function linkMaster(masterId: string, login: string): Promise<boolean> {
  if (!supabase) {
    const links = await read<Record<string, string>>(LOCAL_LINKS, {});
    const d = login.replace(/\D/g, '').slice(-9);
    if (!login.trim()) delete links[masterId];
    else links[masterId] = `local-996${d}`;
    await write(LOCAL_LINKS, links);
    return true;
  }
  const { data, error } = await supabase.rpc('admin_link_master', { p_master: masterId, p_login: login.trim() || null });
  if (error) throw error;
  return data === true;
}

// Админ: кайсы мастерлер аккаунтка байланган
export async function fetchMasterLinks(): Promise<Record<string, boolean>> {
  if (!supabase) {
    const links = await read<Record<string, string>>(LOCAL_LINKS, {});
    return Object.fromEntries(Object.keys(links).map((k) => [k, true]));
  }
  const { data, error } = await supabase.from('master_accounts').select('master_id');
  if (error) return {};
  return Object.fromEntries((data as { master_id: string }[]).map((r) => [r.master_id, true]));
}

// ---------- «Мастер болом» ----------
export type AppStatus = 'new' | 'contacted' | 'hired' | 'rejected';
export type MasterApplication = { id: string; createdAt: string; name: string; phone: string; experience: string; specialty: string; branch: string; comment: string; status: AppStatus };

export async function sendApplication(a: Omit<MasterApplication, 'id' | 'createdAt' | 'status'>): Promise<void> {
  if (!supabase) {
    const l = await read<MasterApplication[]>(LOCAL_APPS, []);
    l.unshift({ ...a, id: String(Date.now()), createdAt: new Date().toISOString(), status: 'new' });
    await write(LOCAL_APPS, l);
    return;
  }
  const { error } = await supabase.from('master_applications').insert({
    name: a.name.trim(),
    phone: a.phone.trim(),
    experience: a.experience.trim(),
    specialty: a.specialty.trim(),
    branch: a.branch,
    comment: a.comment.trim(),
  });
  if (error) throw error;
}

export async function fetchApplications(): Promise<MasterApplication[]> {
  if (!supabase) return read<MasterApplication[]>(LOCAL_APPS, []);
  const { data, error } = await supabase.from('master_applications').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data as { id: string; created_at: string; name: string; phone: string; experience: string; specialty: string; branch: string; comment: string; status: AppStatus }[]).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    name: r.name,
    phone: r.phone,
    experience: r.experience,
    specialty: r.specialty,
    branch: r.branch,
    comment: r.comment,
    status: r.status,
  }));
}

export async function setApplicationStatus(id: string, status: AppStatus): Promise<void> {
  if (!supabase) {
    await write(LOCAL_APPS, (await read<MasterApplication[]>(LOCAL_APPS, [])).map((a) => (a.id === id ? { ...a, status } : a)));
    return;
  }
  const { error } = await supabase.from('master_applications').update({ status }).eq('id', id);
  if (error) throw error;
}

// ---------- Админ: мастердин аккаунту ----------
// Бир мастердин бардык заказдары (админ үчүн)
export async function fetchMasterRepairs(masterId: string): Promise<Repair[]> {
  if (!supabase) return (await read<Repair[]>(LOCAL, [])).filter((r) => r.masterId === masterId);
  const { data, error } = await supabase.from('repair_requests').select('*').eq('master_id', masterId).order('created_at', { ascending: false }).limit(500);
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

// Мастер кайсы аккаунтка (телефонго) байланган
export async function fetchMasterAccount(masterId: string): Promise<{ login: string; name: string } | null> {
  if (!supabase) {
    const links = await read<Record<string, string>>(LOCAL_LINKS, {});
    return links[masterId] ? { login: links[masterId].replace('local-', '+'), name: '' } : null;
  }
  const { data, error } = await supabase.rpc('admin_master_accounts');
  if (error) return null;
  const r = (data as { master_id: string; login: string; full_name: string }[]).find((x) => x.master_id === masterId);
  return r ? { login: r.login, name: r.full_name } : null;
}
