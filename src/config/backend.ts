// Сервердин жөндөөлөрү. Маанилерди `.env` файлына жазыңыз (`.env.example` караңыз).
// Supabase жөндөлбөсө, колдонмо "жергиликтүү режимде" иштейт: маалымат ушул
// түзмөктүн ичинде гана сакталат (демо жана сыноо үчүн).
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isRemote = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Жергиликтүү режимдеги админ PIN-коду (Supabase туташканда email + сырсөз колдонулат).
export const LOCAL_ADMIN_PIN = process.env.EXPO_PUBLIC_ADMIN_PIN ?? '1234';

// Сүрөттөр сакталуучу Supabase Storage бакети.
export const IMAGES_BUCKET = 'products';
