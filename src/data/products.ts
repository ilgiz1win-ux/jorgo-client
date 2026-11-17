import type { ComponentProps } from 'react';
import type { ImageSourcePropType } from 'react-native';
import type { MaterialCommunityIcons } from '@expo/vector-icons';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type CategoryId = 'ebike' | 'battery' | 'motor' | 'parts' | 'charger' | 'accessory';

export type Category = { id: CategoryId; title: string; icon: IconName; color: string };

export type Product = {
  id: string;
  name: string;
  category: CategoryId;
  price: number;
  oldPrice?: number;
  icon: IconName;
  // Сүрөт (милдеттүү эмес). Мисалы: require('../../assets/products/fat-bike.jpg')
  // же интернеттеги шилтеме: { uri: 'https://...' }. Сүрөт жок болсо иконка көрүнөт.
  image?: ImageSourcePropType;
  description: string;
  specs: [string, string][];
  inStock: boolean;
  popular?: boolean;
};

export const CATEGORIES: Category[] = [
  { id: 'ebike', title: 'Электровелосипеддер', icon: 'bicycle-electric', color: '#0F766E' },
  { id: 'battery', title: 'Батареялар', icon: 'battery-charging-high', color: '#16A34A' },
  { id: 'motor', title: 'Мотор-дөңгөлөктөр', icon: 'engine', color: '#7C3AED' },
  { id: 'parts', title: 'Запчасттар', icon: 'cog', color: '#EA580C' },
  { id: 'charger', title: 'Заряддагычтар', icon: 'power-plug', color: '#0284C7' },
  { id: 'accessory', title: 'Аксессуарлар', icon: 'shield-half-full', color: '#DB2777' },
];

// Мисал товарлар — өзүңүздүн товарларыңызга алмаштырыңыз.
export const PRODUCTS: Product[] = [
  {
    id: 'eb-city-350',
    name: 'Электровелосипед City 350W',
    category: 'ebike',
    price: 65000,
    oldPrice: 72000,
    icon: 'bicycle-electric',
    description: 'Шаар үчүн ыңгайлуу электровелосипед. Жеңил алюминий рама, бир заряддан 50 км чейин жүрөт.',
    specs: [['Мотор', '350 Вт'], ['Батарея', '36V 10Ah'], ['Жүрүш', '40–50 км'], ['Ылдамдык', '25 км/с чейин'], ['Дөңгөлөк', '26"']],
    inStock: true,
    popular: true,
  },
  {
    id: 'eb-fat-750',
    name: 'Fat-bike 750W',
    category: 'ebike',
    price: 98000,
    icon: 'bicycle-electric',
    description: 'Жоон дөңгөлөктүү күчтүү велосипед — тоо, кум жана кар жолдоруна ылайыктуу.',
    specs: [['Мотор', '750 Вт'], ['Батарея', '48V 15Ah'], ['Жүрүш', '60–70 км'], ['Ылдамдык', '40 км/с чейин'], ['Дөңгөлөк', '26" x 4.0']],
    inStock: true,
    popular: true,
  },
  {
    id: 'eb-fold-250',
    name: 'Бүктөлүүчү E-Fold 250W',
    category: 'ebike',
    price: 52000,
    icon: 'bicycle',
    description: 'Бүктөлмө, машинанын багажына батат. Күнүмдүк сапарлар үчүн эң сонун.',
    specs: [['Мотор', '250 Вт'], ['Батарея', '36V 7.8Ah'], ['Жүрүш', '30–35 км'], ['Салмагы', '19 кг'], ['Дөңгөлөк', '20"']],
    inStock: false,
  },
  {
    id: 'bat-48-15',
    name: 'Литий батарея 48V 15Ah',
    category: 'battery',
    price: 24000,
    icon: 'battery-high',
    description: 'Сапаттуу литий-ион батарея, BMS коргоосу менен. Көпчүлүк электровелосипеддерге туура келет.',
    specs: [['Чыңалуу', '48V'], ['Сыйымдуулук', '15Ah'], ['Цикл', '800+'], ['Кепилдик', '6 ай']],
    inStock: true,
    popular: true,
  },
  {
    id: 'bat-36-10',
    name: 'Литий батарея 36V 10Ah',
    category: 'battery',
    price: 16500,
    icon: 'battery-medium',
    description: 'Шаардык велосипеддер үчүн компакттуу батарея.',
    specs: [['Чыңалуу', '36V'], ['Сыйымдуулук', '10Ah'], ['Цикл', '600+'], ['Кепилдик', '6 ай']],
    inStock: true,
  },
  {
    id: 'mot-rear-500',
    name: 'Арткы мотор-дөңгөлөк 500W',
    category: 'motor',
    price: 18000,
    icon: 'engine',
    description: 'Кадимки велосипедди электровелосипедге айландыруу үчүн мотор-дөңгөлөк.',
    specs: [['Кубаттуулук', '500 Вт'], ['Чыңалуу', '36–48V'], ['Өлчөм', '26" / 28"']],
    inStock: true,
  },
  {
    id: 'kit-1000',
    name: 'Конверсия комплекти 1000W',
    category: 'motor',
    price: 27500,
    icon: 'toolbox',
    description: 'Толук комплект: мотор, контроллер, дисплей, газ ручкасы жана тормоз датчиктери.',
    specs: [['Кубаттуулук', '1000 Вт'], ['Чыңалуу', '48V'], ['Дисплей', 'LCD']],
    inStock: true,
    popular: true,
  },
  {
    id: 'ctrl-48',
    name: 'Контроллер 48V 25A',
    category: 'parts',
    price: 3500,
    icon: 'chip',
    description: 'Синус толкундуу үнсүз контроллер.',
    specs: [['Чыңалуу', '36–48V'], ['Ток', '25A']],
    inStock: true,
  },
  {
    id: 'brake-pads',
    name: 'Тормоз колодкалары (жуп)',
    category: 'parts',
    price: 450,
    icon: 'car-brake-alert',
    description: 'Диск тормоздору үчүн колодкалар.',
    specs: [['Түрү', 'Диск'], ['Саны', '2 даана']],
    inStock: true,
  },
  {
    id: 'tire-26',
    name: 'Покрышка 26" x 2.125',
    category: 'parts',
    price: 1200,
    icon: 'tire',
    description: 'Шаардык жана аралаш жолдор үчүн бекем покрышка.',
    specs: [['Өлчөм', '26" x 2.125']],
    inStock: true,
  },
  {
    id: 'display-lcd',
    name: 'LCD дисплей',
    category: 'parts',
    price: 2800,
    icon: 'monitor-dashboard',
    description: 'Ылдамдыкты, батареяны жана аралыкты көрсөтүүчү дисплей.',
    specs: [['Чыңалуу', '24–48V']],
    inStock: true,
  },
  {
    id: 'chg-48',
    name: 'Заряддагыч 48V 2A',
    category: 'charger',
    price: 2200,
    icon: 'power-plug',
    description: '48V литий батареялар үчүн заряддагыч.',
    specs: [['Чыгуу', '54.6V 2A']],
    inStock: true,
  },
  {
    id: 'chg-36',
    name: 'Заряддагыч 36V 2A',
    category: 'charger',
    price: 1900,
    icon: 'power-plug-outline',
    description: '36V литий батареялар үчүн заряддагыч.',
    specs: [['Чыгуу', '42V 2A']],
    inStock: true,
  },
  {
    id: 'helmet',
    name: 'Коргоочу шлем',
    category: 'accessory',
    price: 2500,
    icon: 'racing-helmet',
    description: 'Желдетүүчү тешиктери бар жеңил шлем.',
    specs: [['Өлчөм', 'M / L']],
    inStock: true,
    popular: true,
  },
  {
    id: 'lock',
    name: 'Кулпу (чынжыр)',
    category: 'accessory',
    price: 1500,
    icon: 'lock',
    description: 'Ачкычы менен бекем чынжыр кулпу.',
    specs: [['Узундугу', '1 м']],
    inStock: true,
  },
  {
    id: 'light',
    name: 'LED фара',
    category: 'accessory',
    price: 900,
    icon: 'flashlight',
    description: 'USB аркылуу заряддалуучу жаркыраган фара.',
    specs: [['Жарыгы', '800 лм']],
    inStock: true,
  },
];

export const getProduct = (id: string) => PRODUCTS.find((p) => p.id === id);
export const getCategory = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!;
