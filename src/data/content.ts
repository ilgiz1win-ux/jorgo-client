import { translate, type Lang } from '../i18n';

// Башкы беттин жөндөөлөрү, кардарлардын пикирлери жана «чейин / кийин» галереясы.
// Баарын админ панелден өзгөртсө болот.

export type Stat = { value: string; label: string };

export type SiteSettings = {
  heroImageUrl?: string;
  heroTitle: string;
  heroText: string;
  stats: Stat[];
};

export const DEFAULT_SETTINGS: SiteSettings = {
  heroTitle: 'Электровелосипеддер жана оңдоо',
  heroText: 'Запчасттар, батареялар жана тез оңдоо — Бишкекте 3 филиал',
  stats: [
    { value: '8 800+', label: 'Instagram жазылуучу' },
    { value: '3', label: 'филиал' },
    { value: '✓', label: 'кепилдик' },
    { value: '9–21', label: 'күн сайын' },
  ],
};

export type Review = {
  id: string;
  name: string;
  text: string;
  rating: number; // 1–5
};

// Оңдоо мастерлери (админ панелден башкарылат)
export type Master = {
  id: string;
  name: string;
  photoUrl?: string;
  specialty: string;
  experience: string;
  branch: string;
  active: boolean;
};

export type GalleryItem = {
  id: string;
  title: string;
  beforeUrl?: string;
  afterUrl?: string;
};

// Админ өзгөртө элек болсо, баштапкы тексттерди тандалган тилде көрсөтөбүз.
// Админ жазган тексттер жазылган бойдон калат.

export function localizeSettings(s: SiteSettings, lang: Lang): SiteSettings {
  if (lang === 'ky') return s;
  return {
    ...s,
    heroTitle: s.heroTitle === DEFAULT_SETTINGS.heroTitle ? translate(lang, 'home.defaultHeroTitle') : s.heroTitle,
    heroText: s.heroText === DEFAULT_SETTINGS.heroText ? translate(lang, 'home.defaultHeroText') : s.heroText,
  };
}

const DEFAULT_STAT_KEYS = ['home.statFollowers', 'home.statBranches', 'home.statWarranty', 'home.statDaily'] as const;

export function localizeStats(stats: Stat[], lang: Lang): Stat[] {
  if (lang === 'ky') return stats;
  return stats.map((st, i) =>
    DEFAULT_SETTINGS.stats[i] && st.label === DEFAULT_SETTINGS.stats[i].label ? { ...st, label: translate(lang, DEFAULT_STAT_KEYS[i]) } : st,
  );
}
