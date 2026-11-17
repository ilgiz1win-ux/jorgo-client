import type { IconName } from './products';

export type RepairService = { id: string; title: string; price: string; icon: IconName };

// Оңдоо кызматтары — бааларды өзүңүз өзгөртүңүз.
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
