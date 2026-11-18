// Электровелосипед ижарасы (аренда). Админ панелден башкарылат.

export type RentPeriod = 'day' | 'week' | 'month';
export const RENT_PERIODS: RentPeriod[] = ['day', 'week', 'month'];

export type RentalBike = {
  id: string;
  name: string;
  imageUrl?: string;
  description: string;
  specs: [string, string][];
  // Баалар (сом). Бош болсо, ал мөөнөт сунушталбайт.
  priceDay?: number;
  priceWeek?: number;
  priceMonth?: number;
  // Күрөө (залог), сом
  deposit?: number;
  available: boolean;
};

export const priceFor = (b: RentalBike, p: RentPeriod) => (p === 'day' ? b.priceDay : p === 'week' ? b.priceWeek : b.priceMonth);
export const periodsOf = (b: RentalBike) => RENT_PERIODS.filter((p) => !!priceFor(b, p));

// Ижаранын шарттары (админ өзгөртөт). Ар бир сап — өзүнчө шарт.
export type RentTerms = { text: string };
export const DEFAULT_RENT_TERMS: RentTerms = { text: '' };

// Демо режим үчүн гана мисалдар (сервер туташканда көрсөтүлбөйт)
export const DEMO_RENTALS: RentalBike[] = [
  {
    id: 'demo-rent-1',
    name: 'Курьерлер үчүн электровелосипед',
    description: 'Күчтүү батарея, жүк салгыч менен. Мисал — өзүңүздүн маалыматыңызга алмаштырыңыз.',
    specs: [
      ['Мотор', '500 Вт'],
      ['Жүрүш', '60 км'],
    ],
    priceDay: 600,
    priceWeek: 3500,
    priceMonth: 12000,
    deposit: 5000,
    available: true,
  },
];
