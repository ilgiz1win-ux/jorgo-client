import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { base64ToBytes } from './catalogApi';
import { supabase } from './supabase';

// Кардар аккаунту: телефон + сырсөз. SMS кызматы туташмайынча телефон номери
// ички email'ге айландырылат (996700123456@phone.jorgo.app) — кардар аны көрбөйт.

export type DocKind = 'selfie' | 'passport' | 'license';
export const DOC_KINDS: DocKind[] = ['selfie', 'passport', 'license'];

export type Relative = { name: string; relation: string; phone: string };
export const RELATIVES_REQUIRED = 2;

export type Profile = {
  id: string;
  fullName: string;
  phone: string;
  birthDate: string;
  address: string;
  passportNo: string;
  // Почта менен катталса — почтасы (телефону кийин суралат)
  email?: string;
  selfiePath?: string;
  passportPath?: string;
  licensePath?: string;
  // Туугандары (ижара үчүн байланыш)
  relatives: Relative[];
  verified: boolean;
};

type Row = {
  id: string;
  full_name: string;
  phone: string;
  birth_date: string;
  address: string;
  passport_no: string;
  selfie_path: string | null;
  passport_path: string | null;
  license_path: string | null;
  relatives?: Relative[] | null;
  verified: boolean;
};

export const DOCS_BUCKET = 'documents';
const LOCAL_USER = 'jorgo.local.customer';
const LOCAL_PROFILES = 'jorgo.local.profiles';

const fromRow = (r: Row): Profile => ({
  id: r.id,
  fullName: r.full_name,
  phone: r.phone,
  birthDate: r.birth_date,
  address: r.address,
  passportNo: r.passport_no,
  selfiePath: r.selfie_path ?? undefined,
  passportPath: r.passport_path ?? undefined,
  licensePath: r.license_path ?? undefined,
  relatives: Array.isArray(r.relatives) ? r.relatives : [],
  verified: r.verified,
});

const toRow = (p: Profile) => {
  const relatives = p.relatives
    .map((x) => ({ name: x.name.trim(), relation: x.relation.trim(), phone: x.phone.trim() }))
    .filter((x) => x.name || x.phone)
    .slice(0, 3);
  return {
    id: p.id,
    full_name: p.fullName.trim(),
    phone: p.phone.trim(),
    birth_date: p.birthDate.trim(),
    address: p.address.trim(),
    passport_no: p.passportNo.trim().toUpperCase(),
    selfie_path: p.selfiePath ?? null,
    passport_path: p.passportPath ?? null,
    license_path: p.licensePath ?? null,
    // Бош болсо жибербейбиз (009_relatives.sql иштетилбесе да катталуу иштесин)
    ...(relatives.length ? { relatives } : {}),
  };
};

export const relativeValid = (r?: Relative) => !!r && r.name.trim().length > 1 && r.phone.replace(/\D/g, '').length >= 9;
export const relativesReady = (list: Relative[]) => list.filter(relativeValid).length >= RELATIVES_REQUIRED;

export const docPathKey = (k: DocKind): 'selfiePath' | 'passportPath' | 'licensePath' => (k === 'selfie' ? 'selfiePath' : k === 'passport' ? 'passportPath' : 'licensePath');

// "+996 700 12-34-56" → "996700123456". Жергиликтүү 0700… форматын да кабыл алат.
export function normalizePhone(input: string): string | null {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('0')) d = d.slice(1);
  if (d.length === 9) d = '996' + d;
  return /^996\d{9}$/.test(d) ? d : null;
}
export const formatPhone = (d: string) => (d.length === 12 ? `+${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}` : d);
const phoneEmail = (d: string) => `${d}@phone.jorgo.app`;
// Мастердин аккаунту (админ гана түзөт) — кардардыкынан өзүнчө
export const masterEmail = (d: string) => `${d}@master.jorgo.app`;

export const emptyProfile = (id: string, phone = ''): Profile => ({
  id,
  fullName: '',
  phone,
  birthDate: '',
  address: '',
  passportNo: '',
  relatives: [],
  verified: false,
});

export type AuthError = 'invalidPhone' | 'shortPassword' | 'wrongLogin' | 'exists' | 'signupClosed' | 'network' | 'unknown' | 'invalidEmail' | 'badCode' | 'tooMany';

function mapError(message: string): AuthError {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'wrongLogin';
  if (m.includes('already registered') || m.includes('already exists')) return 'exists';
  if (m.includes('signups not allowed') || m.includes('signup is disabled') || m.includes('not allowed')) return 'signupClosed';
  if (m.includes('fetch') || m.includes('network')) return 'network';
  if (m.includes('expired') || m.includes('invalid') && m.includes('token') || m.includes('otp')) return 'badCode';
  if (m.includes('rate') || m.includes('too many') || m.includes('seconds')) return 'tooMany';
  return 'unknown';
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const v = await AsyncStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function currentUserId(): Promise<string | null> {
  if (!supabase) return readJson<string | null>(LOCAL_USER, null);
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function signUp(phoneInput: string, password: string, fullName: string): Promise<AuthError | null> {
  const phone = normalizePhone(phoneInput);
  if (!phone) return 'invalidPhone';
  if (password.length < 6) return 'shortPassword';
  if (!supabase) {
    const id = `local-${phone}`;
    await AsyncStorage.setItem(LOCAL_USER, JSON.stringify(id));
    const all = await readJson<Record<string, Profile>>(LOCAL_PROFILES, {});
    all[id] = { ...(all[id] ?? emptyProfile(id)), fullName: fullName.trim(), phone: formatPhone(phone) };
    await AsyncStorage.setItem(LOCAL_PROFILES, JSON.stringify(all));
    return null;
  }
  const { data, error } = await supabase.auth.signUp({ email: phoneEmail(phone), password, options: { data: { phone, full_name: fullName.trim() } } });
  if (error) return mapError(error.message);
  // "Confirm email" күйүк болсо, сессия келбейт
  if (!data.session) return 'signupClosed';
  // Supabase бар email'ге ката бербей, бош identities кайтарат
  if (data.user && data.user.identities?.length === 0) return 'exists';
  const id = data.user!.id;
  await supabase.from('profiles').upsert(toRow({ ...emptyProfile(id, formatPhone(phone)), fullName }));
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Gmail (же башка почта) менен кирүү/катталуу: почтага 6 сандуу код барат
export async function sendEmailCode(emailInput: string): Promise<AuthError | null> {
  const email = emailInput.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return 'invalidEmail';
  if (!supabase) return null; // демо: каалаган код иштейт
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  return error ? mapError(error.message) : null;
}

export async function verifyEmailCode(emailInput: string, code: string): Promise<AuthError | null> {
  const email = emailInput.trim().toLowerCase();
  const token = code.replace(/\D/g, '');
  if (token.length < 6) return 'badCode';
  if (!supabase) {
    const id = `local-${email}`;
    await AsyncStorage.setItem(LOCAL_USER, JSON.stringify(id));
    const all = await readJson<Record<string, Profile>>(LOCAL_PROFILES, {});
    all[id] = all[id] ?? { ...emptyProfile(id), email };
    await AsyncStorage.setItem(LOCAL_PROFILES, JSON.stringify(all));
    return null;
  }
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) return mapError(error.message);
  if (data.user) {
    const { data: existing } = await supabase.from('profiles').select('id').eq('id', data.user.id).maybeSingle();
    if (!existing) await supabase.from('profiles').upsert(toRow({ ...emptyProfile(data.user.id), email }));
  }
  return null;
}

export async function signIn(phoneInput: string, password: string, master = false): Promise<AuthError | null> {
  const phone = normalizePhone(phoneInput);
  if (!phone) return 'invalidPhone';
  if (!supabase) {
    const id = master ? `local-master-${phone}` : `local-${phone}`;
    const all = await readJson<Record<string, Profile>>(LOCAL_PROFILES, {});
    if (!all[id]) return 'wrongLogin';
    await AsyncStorage.setItem(LOCAL_USER, JSON.stringify(id));
    return null;
  }
  const { error } = await supabase.auth.signInWithPassword({ email: master ? masterEmail(phone) : phoneEmail(phone), password });
  return error ? mapError(error.message) : null;
}

export async function signOut(): Promise<void> {
  if (!supabase) {
    await AsyncStorage.removeItem(LOCAL_USER).catch(() => {});
    return;
  }
  await supabase.auth.signOut();
}

export async function fetchProfile(id: string): Promise<Profile> {
  if (!supabase) {
    const all = await readJson<Record<string, Profile>>(LOCAL_PROFILES, {});
    return all[id] ?? emptyProfile(id);
  }
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  const { data: sess } = await supabase.auth.getSession();
  const mail = sess.session?.user.email;
  const email = mail && !mail.endsWith('@phone.jorgo.app') ? mail : undefined;
  if (data) return { ...fromRow(data as Row), email };
  // Профиль жок болсо (мисалы, катталганда тармак үзүлсө) — түзөбүз
  const { data: s } = await supabase.auth.getSession();
  const meta = (s.session?.user.user_metadata ?? {}) as { phone?: string; full_name?: string };
  const p = { ...emptyProfile(id, meta.phone ? formatPhone(meta.phone) : ''), fullName: meta.full_name ?? '' };
  await supabase.from('profiles').upsert(toRow(p));
  return p;
}

export async function saveProfile(p: Profile): Promise<Profile> {
  if (!supabase) {
    const all = await readJson<Record<string, Profile>>(LOCAL_PROFILES, {});
    all[p.id] = p;
    await AsyncStorage.setItem(LOCAL_PROFILES, JSON.stringify(all));
    return p;
  }
  const { data, error } = await supabase.from('profiles').upsert(toRow(p)).select('*').single();
  if (error) throw error;
  return fromRow(data as Row);
}

// Документтин сүрөтүн тартат же галереядан алат да, жабык бакетке жүктөйт. Жолун кайтарат.
export async function pickAndUploadDoc(userId: string, kind: DocKind, source: 'camera' | 'library'): Promise<string | null> {
  const opts: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: kind === 'selfie' ? [3, 4] : [4, 3],
    quality: 0.6,
    base64: true,
    cameraType: kind === 'selfie' ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
  };
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('camera');
  }
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  let base64 = asset.base64 ?? '';
  let mime = asset.mimeType ?? 'image/jpeg';
  if (!base64 && asset.uri.startsWith('data:')) {
    const m = asset.uri.match(/^data:([^;]+);base64,(.*)$/);
    if (m) [, mime, base64] = m;
  }
  if (!base64) throw new Error('read');
  if (!supabase) return `data:${mime};base64,${base64}`;
  const ext = mime.includes('png') ? 'png' : 'jpg';
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(DOCS_BUCKET).upload(path, base64ToBytes(base64), { contentType: mime });
  if (error) throw error;
  return path;
}

// Жабык сүрөттү көрсөтүү үчүн убактылуу шилтеме (1 саат)
export async function docUrl(path?: string): Promise<string | null> {
  if (!path) return null;
  if (!supabase || path.startsWith('data:')) return path;
  const { data } = await supabase.storage.from(DOCS_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function removeDoc(path?: string): Promise<void> {
  if (!path || !supabase || path.startsWith('data:')) return;
  await supabase.storage.from(DOCS_BUCKET).remove([path]);
}

export async function deleteAccount(p: Profile): Promise<void> {
  if (!supabase) {
    const all = await readJson<Record<string, Profile>>(LOCAL_PROFILES, {});
    delete all[p.id];
    await AsyncStorage.setItem(LOCAL_PROFILES, JSON.stringify(all));
    await signOut();
    return;
  }
  const paths = [p.selfiePath, p.passportPath, p.licensePath].filter((x): x is string => !!x);
  if (paths.length) await supabase.storage.from(DOCS_BUCKET).remove(paths);
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  await supabase.auth.signOut();
}

// Админ үчүн: бир нече кардардын профилин алуу
export async function fetchProfiles(ids: string[]): Promise<Record<string, Profile>> {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (!uniq.length) return {};
  if (!supabase) {
    const all = await readJson<Record<string, Profile>>(LOCAL_PROFILES, {});
    return Object.fromEntries(uniq.filter((id) => all[id]).map((id) => [id, all[id]]));
  }
  const { data, error } = await supabase.from('profiles').select('*').in('id', uniq);
  if (error) throw error;
  return Object.fromEntries((data as Row[]).map((r) => [r.id, fromRow(r)]));
}

export async function setVerified(id: string, verified: boolean): Promise<void> {
  if (!supabase) {
    const all = await readJson<Record<string, Profile>>(LOCAL_PROFILES, {});
    if (all[id]) all[id].verified = verified;
    await AsyncStorage.setItem(LOCAL_PROFILES, JSON.stringify(all));
    return;
  }
  const { error } = await supabase.from('profiles').update({ verified }).eq('id', id);
  if (error) throw error;
}

export async function checkIsAdmin(): Promise<boolean> {
  if (!supabase) return true;
  const { data, error } = await supabase.rpc('is_admin');
  // SQL (008) али иштетиле элек болсо, функция жок — мурдагыдай кирген колдонуучу админ
  if (error) return /is_admin|function/i.test(error.message);
  return data === true;
}
