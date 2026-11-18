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

export type GalleryItem = {
  id: string;
  title: string;
  beforeUrl?: string;
  afterUrl?: string;
};
