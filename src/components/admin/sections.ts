import type { IconName } from '../../data/products';

export type Tile = { href: '/admin/stats' | '/admin/rent-requests' | '/admin/rentals' | '/admin/notifications' | '/admin/admins' | '/admin/masters' | '/admin/broadcast' | '/admin/branches' | '/admin/orders' | '/admin/customers' | '/admin/repairs' | '/admin/applications' | '/admin/home' | '/admin/promos' | '/admin/services' | '/admin/reviews' | '/admin/gallery' | '/admin/chats' | '/admin/assistant' | '/admin/wallets' | '/admin/finance'; title: string; text: string; icon: IconName; color: string };

// Ижара панели — дүкөндөн өзүнчө
export const RENT_SECTIONS: Tile[] = [
  { href: '/admin/rent-requests', title: 'Ижаралар жана төлөмдөр', text: 'Өтүнмөлөр, ким төлөдү, ким кечиктирди', icon: 'clipboard-account', color: '#2563EB' },
  { href: '/admin/rentals', title: 'Велосипеддер', text: 'Баалар, GPS жана батарея номерлери', icon: 'bicycle-electric', color: '#0F766E' },
  { href: '/admin/notifications', title: 'Билдирмелер', text: 'Жаңы өтүнмөлөр, төлөм күнү', icon: 'bell-ring', color: '#D97706' },
  { href: '/admin/admins', title: 'Админдер', text: 'Админ кошуу жана алып салуу', icon: 'shield-account', color: '#475569' },
];

export const SECTIONS: Tile[] = [
  { href: '/admin/chats', title: 'Чат', text: 'Кардарлар жана мастерлер жазат — жооп бериңиз', icon: 'chat-processing', color: '#7C3AED' },
  // ИИ жардамчы кийин кошулат (код даяр: /admin/assistant, supabase/functions/admin-assistant)
  { href: '/admin/finance', title: 'Каржы жана абал', text: 'Акча кайдан түштү, соода, ижарадагы велосипеддер', icon: 'finance', color: '#0F172A' },
  { href: '/admin/wallets', title: 'Баланс жана выезд акысы', text: 'Толуктоолорду ырастоо, баланстар, выезд баасы', icon: 'wallet', color: '#15803D' },
  { href: '/admin/orders', title: 'Заказдар', text: 'Алып кетти / отказ, экспресс жол акысы', icon: 'truck-fast', color: '#D97706' },
  { href: '/admin/customers', title: 'Кардарлар', text: 'Катталгандар жана кара тизме', icon: 'account-group', color: '#334155' },
  { href: '/admin/broadcast', title: 'Билдирме жөнөтүү', text: 'Акция, арзандатуу — бардык кардарларга', icon: 'send', color: '#DB2777' },
  { href: '/admin/stats', title: 'Статистика', text: 'Канча адам кирди, кайсы точкага канча заказ', icon: 'chart-bar', color: '#111827' },
  { href: '/admin/branches', title: 'Точкалар', text: 'Точкалардын жана экспресстин номерлери', icon: 'store-marker', color: '#0D9488' },
  { href: '/admin/home', title: 'Башкы бет', text: 'Чоң баннер жана сандар', icon: 'home-edit', color: '#2E7D32' },
  { href: '/admin/promos', title: 'Акциялар', text: 'Баннерлер жана слайдер', icon: 'bullhorn', color: '#7C3AED' },
  { href: '/admin/services', title: 'Оңдоо', text: 'Кызматтар жана баалар', icon: 'wrench', color: '#EA580C' },
  { href: '/admin/repairs', title: 'Оңдоо жана выезд заказдары', text: 'Кайсы мастерге түштү, абалы', icon: 'wrench-clock', color: '#9A3412' },
  { href: '/admin/applications', title: 'Мастер болом дегендер', text: 'Жумушка өтүнмөлөр', icon: 'account-plus', color: '#4D7C0F' },
  { href: '/admin/masters', title: 'Мастерлер', text: 'Сүрөттөрү, адистиги, филиалы', icon: 'account-hard-hat', color: '#B45309' },
  { href: '/admin/reviews', title: 'Пикирлер', text: 'Кардарлар жазган пикирлерди ырастоо', icon: 'star', color: '#CA8A04' },
  { href: '/admin/gallery', title: 'Галерея', text: 'Чейин / кийин сүрөттөр', icon: 'image-multiple', color: '#0284C7' },
];

