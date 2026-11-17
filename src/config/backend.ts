// Сервердин жөндөөлөрү. Маанилерди `.env` файлына жазыңыз (`.env.example` караңыз).
// Supabase жөндөлбөсө, колдонмо "жергиликтүү режимде" иштейт: маалымат ушул
// түзмөктүн ичинде гана сакталат (демо жана сыноо үчүн).
// Publishable ачкычы жашыруун эмес: ал сайттын кодунда баары бир ачык турат,
// маалыматты RLS эрежелери коргойт (supabase/schema.sql).
const DEFAULT_SUPABASE_URL = 'https://fnrexohuaephebnxcgrs.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_Y1PGJ8AdEK8X8HgcEWPwBA_cbdqpMZC';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

export const isRemote = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Жергиликтүү режимдеги админ PIN-коду (Supabase туташканда email + сырсөз колдонулат).
export const LOCAL_ADMIN_PIN = process.env.EXPO_PUBLIC_ADMIN_PIN ?? '1234';

// Сүрөттөр сакталуучу Supabase Storage бакети.
export const IMAGES_BUCKET = 'products';
