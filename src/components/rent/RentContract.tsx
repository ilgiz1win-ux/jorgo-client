import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../config/theme';
import { RENT_MIN_DAYS } from '../../data/rentals';
import type { Profile } from '../../lib/account';
import { formatPrice } from '../../lib/format';
import type { RentRequest } from '../../lib/rentRequests';

const LOGO = require('../../../assets/brand/logo.png');
const d = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('ru-RU') : '—');

function Line({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.line}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} selectable>
        {value === undefined || value === null || value === '' ? '—' : String(value)}
      </Text>
    </View>
  );
}

// Электрондук «Договор аренды велосипеда» — кагаз келишимдей. Кардар да, админ да көрөт жана басып чыгарат.
export function RentContract({ r, p, printLabel }: { r: RentRequest; p?: Profile | null; printLabel: string }) {
  const daily = r.dailyPrice ?? 0;
  const terms = [
    `Арендная плата — ${formatPrice(daily)} в сутки. День получения велосипеда бесплатный; со следующего дня плата ежедневно списывается с баланса Арендатора в приложении Jorgo.`,
    `Минимальный срок аренды — ${RENT_MIN_DAYS} дней. При досрочном возврате (например, через 3–4 дня) плата за неделю не возвращается.`,
    'Когда на балансе остаётся сумма за одни сутки, Арендатору приходит напоминание; баланс необходимо пополнить вовремя.',
    'Поломка электроники — Арендатор оплачивает 50% стоимости ремонта.',
    'Поломка механических частей — Арендатор оплачивает ремонт полностью.',
    'Замену батареи производит Арендодатель бесплатно.',
    `При утере велосипеда или его частей Арендатор возмещает полную стоимость${r.bikeValue ? ` (стоимость велосипеда — ${formatPrice(r.bikeValue)})` : ''}.`,
    'Арендатор согласен на передачу паспортных данных и местоположения (GPS) для целей аренды.',
  ];
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <View style={styles.paper}>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Image source={LOGO} style={{ width: 140, height: 76 }} resizeMode="contain" />
          <Text style={styles.title}>ДОГОВОР АРЕНДЫ ВЕЛОСИПЕДА № {r.contractNo ?? '—'}</Text>
          <Text style={styles.muted}>г. Бишкек · Дата: {d(r.startedAt ?? r.createdAt)}</Text>
        </View>

        <Text style={styles.h}>Арендатор</Text>
        <Line label="ФИО" value={p?.fullName || r.name} />
        <Line label="Паспорт" value={p?.passportNo || r.passport} />
        <Line label="Выдан" value={p?.passportIssuedBy} />
        <Line label="Адрес" value={p?.address} />
        <Line label="Телефон" value={[p?.phone || r.phone, p?.phone2].filter(Boolean).join(', ')} />
        {!!p?.relatives?.length && <Line label="Родственники" value={p.relatives.map((x) => `${x.name} (${x.relation}) ${x.phone}`).join('; ')} />}
        <Line label="Залог" value={r.collateral} />
        <Line label="Депозит" value={r.deposit ? formatPrice(r.deposit) : undefined} />

        <Text style={styles.h}>1. Предмет аренды</Text>
        <Text style={styles.text}>1.1. Арендодатель (Jorgo Eco Service) передаёт, а Арендатор принимает во временное пользование велосипед:</Text>
        <Line label="Марка/модель" value={r.bikeName} />
        <Line label="Номер электровелосипеда" value={r.bikeNo} />
        <Line label="Жорго №" value={r.jorgoNo} />
        <Line label="Батарейка" value={r.batteryNo} />
        <Line label="Стоимость велосипеда" value={r.bikeValue ? formatPrice(r.bikeValue) : undefined} />
        <Line label="Комплектация" value={(r.kit ?? []).join(', ')} />

        <Text style={styles.h}>2. Условия</Text>
        {terms.map((t, i) => (
          <Text key={i} style={styles.text}>
            2.{i + 1}. {t}
          </Text>
        ))}

        <Text style={styles.h}>3. Подписи</Text>
        <Text style={styles.text}>
          Арендатор ознакомился с условиями и принял их в приложении Jorgo {d(r.createdAt)} (заявка), велосипед выдан {d(r.startedAt)}.
        </Text>
        {r.status === 'returned' && (
          <Text style={styles.text}>
            Велосипед возвращён {d(r.returnedAt)}. Оплачено дней: {r.chargedDays ?? 0}
            {r.damageCharged ? `; ущерб: ${formatPrice(r.damageCharged)}` : ''}
            {r.batterySwapped ? '; батарея заменена' : ''}
            {r.returnNote ? `; ${r.returnNote}` : ''}.
          </Text>
        )}
        <View style={styles.signs}>
          <View style={styles.sign}>
            <View style={styles.signLine} />
            <Text style={styles.muted}>Арендодатель</Text>
          </View>
          <View style={styles.sign}>
            <View style={styles.signLine} />
            <Text style={styles.muted}>Арендатор</Text>
          </View>
        </View>
      </View>
      {Platform.OS === 'web' && (
        <Pressable
          onPress={() => (globalThis as { print?: () => void }).print?.()}
          style={styles.print}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="printer" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800' }}>{printLabel}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  paper: { backgroundColor: '#fff', borderRadius: 12, padding: 20, gap: 6, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 16, fontWeight: '900', color: '#111', textAlign: 'center', marginTop: 4 },
  h: { fontSize: 15, fontWeight: '900', color: '#111', marginTop: 12 },
  text: { fontSize: 13, color: '#222', lineHeight: 19 },
  muted: { fontSize: 12, color: colors.muted },
  line: { flexDirection: 'row', gap: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingVertical: 4 },
  label: { width: 150, fontSize: 13, color: colors.muted },
  value: { flex: 1, fontSize: 14, color: '#111', fontWeight: '700' },
  signs: { flexDirection: 'row', gap: 20, marginTop: 28 },
  sign: { flex: 1, gap: 4, alignItems: 'center' },
  signLine: { alignSelf: 'stretch', height: 1, backgroundColor: '#111', marginTop: 24 },
  print: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 12, marginTop: 14 },
});
