import type { IconName } from './products';

export type RepairService = { id: string; title: string; price: string; icon: IconName };

// Админ панелде кызматка тандаса боло турган иконкалар
export const SERVICE_ICONS: IconName[] = [
  'wrench',
  'stethoscope',
  'battery-sync',
  'engine',
  'chip',
  'flash',
  'car-brake-alert',
  'tire',
  'bicycle-electric',
  'cog',
  'lightbulb-on',
  'shield-check',
];

// Баштапкы оңдоо кызматтары (сервер туташпаса же база бош болсо).
// Бааларды админ панелден өзгөртүңүз.
export const SERVICES: RepairService[] = [
  { id: 'diag', title: 'Диагностика', price: '300 сом', icon: 'stethoscope' },
  { id: 'battery', title: 'Батареяны оңдоо / ячейка алмаштыруу', price: '1500 сомдон', icon: 'battery-sync' },
  { id: 'motor', title: 'Моторду оңдоо', price: '2000 сомдон', icon: 'engine' },
  { id: 'controller', title: 'Контроллер алмаштыруу', price: '800 сом', icon: 'chip' },
  { id: 'wiring', title: 'Электр зымдарын оңдоо', price: '700 сомдон', icon: 'flash' },
  { id: 'brakes', title: 'Тормозду жөндөө', price: '400 сом', icon: 'car-brake-alert' },
  { id: 'tire', title: 'Камера / покрышка алмаштыруу', price: '350 сом', icon: 'tire' },
  { id: 'conversion', title: 'Велосипедди электрлештирүү', price: '3000 сом', icon: 'bicycle-electric' },
  { id: 'service', title: 'Толук тейлөө (ТО)', price: '1500 сом', icon: 'wrench' },
];
