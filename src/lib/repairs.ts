import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/backend';
import { base64ToBytes } from './catalogApi';
import { supabase } from './supabase';
import { getWalletSettings, localChargeOutcall, localRefundOutcall, localUserId } from './wallet';

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
  updatedAt?: string;
  photos: string[];
  address: string;
  lat?: number;
  lng?: number;
  visitAt?: string;
  bring: string;
  outcallFee?: number;
  arrivedAt?: string;
  userId?: string;
  etaAt?: string;
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
  updated_at?: string;
  photos?: string[];
  address?: string;
  lat?: number | null;
  lng?: number | null;
  visit_at?: string | null;
  bring?: string;
  outcall_fee?: number | null;
  arrived_at?: string | null;
  user_id?: string | null;
  eta_at?: string | null;
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
  updatedAt: r.updated_at,
  photos: Array.isArray(r.photos) ? r.photos : [],
  address: r.address ?? '',
  lat: r.lat ?? undefined,
  lng: r.lng ?? undefined,
  visitAt: r.visit_at ?? undefined,
  bring: r.bring ?? '',
  outcallFee: r.outcall_fee ?? undefined,
  arrivedAt: r.arrived_at ?? undefined,
  userId: r.user_id ?? undefined,
  etaAt: r.eta_at ?? undefined,
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

export async function createRepair(r: Omit<Repair, 'id' | 'createdAt' | 'status' | 'masterNote' | 'bring'>): Promise<'ok' | 'blocked' | 'error' | 'login' | 'balance'> {
  if (!supabase) {
    const l = await read<Repair[]>(LOCAL, []);
    const id = String(Date.now());
    let outcallFee: number | undefined;
    if (r.outcall) {
      const res = await localChargeOutcall(id, r.number);
      if (res !== 'ok') return res;
      outcallFee = (await getWalletSettings()).outcallFee;
    }
    l.unshift({ ...r, id, createdAt: new Date().toISOString(), status: 'new', masterNote: '', bring: '', outcallFee, userId: (await localUserId()) ?? undefined });
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
    photos: r.photos,
    address: r.address,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    visit_at: r.visitAt ?? null,
  });
  if (!error) return 'ok';
  if (/outcall_login_required/.test(error.message)) return 'login';
  if (/outcall_low_balance/.test(error.message)) return 'balance';
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

export async function updateRepair(id: string, patch: { status?: RepairStatus; masterNote?: string; masterId?: string | null; visitAt?: string | null; bring?: string; arrived?: boolean; etaAt?: string }): Promise<Repair | null> {
  if (!supabase) {
    const l = (await read<Repair[]>(LOCAL, [])).map((x) =>
      x.id === id
        ? { ...x, updatedAt: new Date().toISOString(), visitAt: patch.visitAt === undefined ? x.visitAt : patch.visitAt ?? undefined, bring: patch.bring ?? x.bring, arrivedAt: patch.arrived && !x.arrivedAt ? new Date().toISOString() : x.arrivedAt, etaAt: patch.etaAt ?? x.etaAt, status: patch.status ?? x.status, masterNote: patch.masterNote ?? x.masterNote, masterId: patch.masterId === undefined ? x.masterId : patch.masterId ?? undefined }
        : x,
    );
    await write(LOCAL, l);
    const n = l.find((x) => x.id === id) ?? null;
    if (n && patch.status === 'cancelled' && n.outcall && !n.arrivedAt) await localRefundOutcall(n.id, n.number);
    return n;
  }
  const row: Record<string, unknown> = {};
  if (patch.status) row.status = patch.status;
  if (patch.masterNote !== undefined) row.master_note = patch.masterNote;
  if (patch.masterId !== undefined) row.master_id = patch.masterId;
  if (patch.visitAt !== undefined) row.visit_at = patch.visitAt;
  if (patch.bring !== undefined) row.bring = patch.bring;
  if (patch.arrived) row.arrived_at = new Date().toISOString();
  if (patch.etaAt) row.eta_at = patch.etaAt;
  const { data, error } = await supabase.from('repair_requests').update(row).eq('id', id).select('*').single();
  if (error) throw error;
  return fromRow(data as Row);
}

// Кирген колдонуучу мастер болсо — анын мастер ID'си
export async function myMasterId(userId?: string): Promise<string | null> {
  if (!supabase) {
    if (!userId) return null;
    const links = await read<Record<string, string>>(LOCAL_LINKS, {});
    const id = Object.keys(links).find((m) => links[m] === userId) ?? null;
    // Сынак айында панел жабык
    const hires = await read<Record<string, MasterHire>>(LOCAL_HIRES, {});
    return id && hires[id] && !hires[id].panelOpen ? null : id;
  }
  const { data, error } = await supabase.rpc('my_master_id');
  if (error) return null;
  return (data as string | null) ?? null;
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
export type MasterApplication = { id: string; createdAt: string; name: string; phone: string; experience: string; specialty: string; branch: string; comment: string; status: AppStatus; masterId?: string };

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
  return (data as { id: string; created_at: string; name: string; phone: string; experience: string; specialty: string; branch: string; comment: string; status: AppStatus; master_id?: string | null }[]).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    name: r.name,
    phone: r.phone,
    experience: r.experience,
    specialty: r.specialty,
    branch: r.branch,
    comment: r.comment,
    status: r.status,
    masterId: r.master_id ?? undefined,
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

// ---------- Ишке алуу: сынак айы, мастерге аккаунт ----------
export type MasterHire = { masterId: string; login: string; password: string | null; hiredAt: string; trialUntil: string; openedAt: string | null; panelOpen: boolean };
const LOCAL_HIRES = 'jorgo.local.masterHires';

// Айтууга оңой сырсөз (окшош тамгалар жок): мисалы "k7mp4tx2"
export function genPassword(len = 8): string {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  const buf = new Uint32Array(len);
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint32Array) => Uint32Array } }).crypto;
  if (c?.getRandomValues) c.getRandomValues(buf);
  else for (let i = 0; i < len; i++) buf[i] = Math.floor(Math.random() * 1e9);
  return Array.from(buf, (n) => abc[n % abc.length]).join('');
}

// Мастерге аккаунт түзүү (админдин сессиясына тийбейт — өзүнчө убактылуу клиент)
export async function createMasterLogin(phone9: string, password: string, fullName: string): Promise<'created' | 'exists' | 'error'> {
  if (!supabase) {
    // Демо: жергиликтүү профиль (мастер ушул номер менен кире алсын)
    const all = await read<Record<string, unknown>>('jorgo.local.profiles', {});
    const id = `local-master-996${phone9}`;
    if (all[id]) return 'exists';
    all[id] = { id, fullName: fullName, phone: `+996 ${phone9.slice(0, 3)} ${phone9.slice(3, 6)} ${phone9.slice(6)}`, birthDate: '', address: '', passportNo: '', relatives: [], verified: false };
    await write('jorgo.local.profiles', all);
    return 'created';
  }
  const tmp = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'jorgo-hire-tmp' } });
  const phone = '996' + phone9;
  const { data, error } = await tmp.auth.signUp({ email: `${phone}@master.jorgo.app`, password, options: { data: { phone, full_name: fullName } } });
  if (error) return /already/i.test(error.message) ? 'exists' : 'error';
  if (data.user && data.user.identities?.length === 0) return 'exists';
  if (data.session && data.user) {
    const pretty = `+996 ${phone9.slice(0, 3)} ${phone9.slice(3, 6)} ${phone9.slice(6)}`;
    await tmp.from('profiles').upsert({ id: data.user.id, full_name: fullName.slice(0, 80), phone: pretty });
    await tmp.auth.signOut().catch(() => {});
  }
  return data.user ? 'created' : 'error';
}

export async function hireMaster(p: { appId?: string; masterId: string; phone9: string; password: string | null; trialDays: number }): Promise<boolean> {
  if (!supabase) {
    const hires = await read<Record<string, MasterHire>>(LOCAL_HIRES, {});
    const until = new Date(Date.now() + p.trialDays * 86400000).toISOString().slice(0, 10);
    hires[p.masterId] = { masterId: p.masterId, login: '+996' + p.phone9, password: p.password, hiredAt: new Date().toISOString(), trialUntil: until, openedAt: null, panelOpen: false };
    await write(LOCAL_HIRES, hires);
    const links = await read<Record<string, string>>(LOCAL_LINKS, {});
    links[p.masterId] = `local-master-996${p.phone9}`;
    await write(LOCAL_LINKS, links);
    if (p.appId) await write(LOCAL_APPS, (await read<MasterApplication[]>(LOCAL_APPS, [])).map((a) => (a.id === p.appId ? { ...a, status: 'hired' as const, masterId: p.masterId } : a)));
    return true;
  }
  const { data, error } = await supabase.rpc('admin_hire_master', { p_app: p.appId ?? null, p_master: p.masterId, p_phone: p.phone9, p_password: p.password ?? '', p_trial_days: p.trialDays });
  if (error) throw error;
  return data === true;
}

export async function fetchHires(): Promise<Record<string, MasterHire>> {
  if (!supabase) return read<Record<string, MasterHire>>(LOCAL_HIRES, {});
  const [{ data, error }, acc] = await Promise.all([
    supabase.from('master_hires').select('*'),
    supabase.from('master_accounts').select('master_id,panel_open'),
  ]);
  if (error) return {};
  const open = Object.fromEntries(((acc.data ?? []) as { master_id: string; panel_open: boolean }[]).map((r) => [r.master_id, r.panel_open]));
  return Object.fromEntries(
    (data as { master_id: string; login: string; password: string | null; hired_at: string; trial_until: string; opened_at: string | null }[]).map((r) => [
      r.master_id,
      { masterId: r.master_id, login: r.login, password: r.password, hiredAt: r.hired_at, trialUntil: r.trial_until, openedAt: r.opened_at, panelOpen: open[r.master_id] ?? false },
    ]),
  );
}

// Сынак бүттү: панелди ачуу (жана выездге чыгаруу) же кайра жабуу
export async function openMasterPanel(masterId: string, open: boolean, outcall = true): Promise<void> {
  if (!supabase) {
    const hires = await read<Record<string, MasterHire>>(LOCAL_HIRES, {});
    if (hires[masterId]) hires[masterId] = { ...hires[masterId], panelOpen: open, openedAt: open ? new Date().toISOString() : null };
    await write(LOCAL_HIRES, hires);
    return;
  }
  const { error } = await supabase.rpc('admin_open_master_panel', { p_master: masterId, p_open: open, p_outcall: outcall });
  if (error) throw error;
}

// Сынак бүткөнгө чейин канча күн калды (0 же терс — бүттү)
export function trialDaysLeft(trialUntil: string): number {
  const end = new Date(trialUntil + 'T00:00:00').getTime();
  const today = new Date(new Date().toDateString()).getTime();
  return Math.round((end - today) / 86400000);
}

// Админ: мастерге аккаунт түзүү (же мурунтан катталган номерди байлоо). Панел дароо ачык.
export async function createMasterAccount(masterId: string, phone9: string, password: string, fullName: string): Promise<{ ok: boolean; existed: boolean }> {
  const res = await createMasterLogin(phone9, password, fullName);
  if (res === 'error') throw new Error('Аккаунт түзүлгөн жок. Интернетти текшерип, кайра аракет кылыңыз.');
  const pass = res === 'exists' ? null : password;
  if (!supabase) {
    const hires = await read<Record<string, MasterHire>>(LOCAL_HIRES, {});
    const now = new Date().toISOString();
    hires[masterId] = { masterId, login: '+996' + phone9, password: pass, hiredAt: now, trialUntil: now.slice(0, 10), openedAt: now, panelOpen: true };
    await write(LOCAL_HIRES, hires);
    const links = await read<Record<string, string>>(LOCAL_LINKS, {});
    links[masterId] = `local-master-996${phone9}`;
    await write(LOCAL_LINKS, links);
    return { ok: true, existed: res === 'exists' };
  }
  const { data, error } = await supabase.rpc('admin_create_master_account', { p_master: masterId, p_phone: phone9, p_password: pass ?? '' });
  if (error) throw error;
  return { ok: data === true, existed: res === 'exists' };
}

export async function unlinkMaster(masterId: string): Promise<void> {
  if (!supabase) {
    const links = await read<Record<string, string>>(LOCAL_LINKS, {});
    delete links[masterId];
    await write(LOCAL_LINKS, links);
    const hires = await read<Record<string, MasterHire>>(LOCAL_HIRES, {});
    delete hires[masterId];
    await write(LOCAL_HIRES, hires);
    return;
  }
  const { error } = await supabase.rpc('admin_unlink_master', { p_master: masterId });
  if (error) throw error;
}

// Кардар оңдоо заказына сүрөт жүктөйт (кирбесе да болот)
export async function uploadRepairPhoto(base64: string, mime = 'image/jpeg'): Promise<string> {
  if (!supabase) return `data:${mime};base64,${base64}`;
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const path = `req/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { error } = await supabase.storage.from('repairs').upload(path, base64ToBytes(base64), { contentType: mime });
  if (error) throw error;
  return supabase.storage.from('repairs').getPublicUrl(path).data.publicUrl;
}

export const fmtVisit = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Админ: мастерлердин аккаунттары (user_id → мастердин аты) — чатта «👷 Мастер» деп белгилөө үчүн
export async function fetchMasterUsers(names: Record<string, string>): Promise<Record<string, string>> {
  if (!supabase) {
    const links = await read<Record<string, string>>(LOCAL_LINKS, {});
    return Object.fromEntries(Object.entries(links).map(([m, u]) => [u, names[m] ?? '']));
  }
  const { data, error } = await supabase.rpc('admin_master_accounts');
  if (error) return {};
  return Object.fromEntries((data as { master_id: string; user_id: string }[]).map((r) => [r.user_id, names[r.master_id] ?? '']));
}

// Кардардын өз оңдоо заказдары
export async function fetchMyRepairs(userId: string): Promise<Repair[]> {
  if (!supabase) return (await read<Repair[]>(LOCAL, [])).filter((r) => r.userId === userId);
  const { data, error } = await supabase.from('repair_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

// Кардар мастер келгенге чейин жокко чыгарат (выезд акысы кайтарылат)
export async function cancelMyRepair(id: string): Promise<boolean> {
  if (!supabase) {
    const r = (await read<Repair[]>(LOCAL, [])).find((x) => x.id === id);
    if (!r || !['new', 'accepted'].includes(r.status) || r.arrivedAt) return false;
    await updateRepair(id, { status: 'cancelled', masterNote: 'Кардар жокко чыгарды' });
    return true;
  }
  const { data, error } = await supabase.rpc('customer_cancel_repair', { p_id: id });
  if (error) throw error;
  return data === true;
}
