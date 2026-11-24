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
  const sections: [string, string[]][] = [
    [
      '2. Срок и оплата',
      [
        `2.1. Срок аренды: с ${d(r.startedAt)} по ${r.returnedAt ? d(r.returnedAt) : '— (до возврата велосипеда)'}. Минимальный срок — ${RENT_MIN_DAYS} дней; при досрочном возврате (например, через 3–4 дня) плата за неделю не возвращается.`,
        `2.2. Стоимость аренды: ${formatPrice(daily)} в сутки. День получения бесплатный; со следующего дня плата ежедневно списывается с баланса Арендатора в приложении Jorgo. Когда на балансе остаётся сумма за одни сутки, приходит напоминание.`,
        `2.3. Депозит: ${r.deposit ? formatPrice(r.deposit) : '—'}. Возвращается после сдачи велосипеда в исправном виде.`,
        '2.4. Продление аренды только по звонку и согласию Арендодателя.',
      ],
    ],
    [
      '3. Обязанности Арендатора',
      [
        '3.1. Бережно использовать, не прыгать, не ездить по горам/лестницам.',
        '3.2. Не передавать велосипед третьим лицам.',
        '3.3. Не оставлять без присмотра. Обязательно пристёгивать замком.',
        '3.4. В случае поломки — сразу сообщить Арендодателю.',
      ],
    ],
    [
      '4. Ответственность и ущерб',
      [
        '4.1. При повреждении велосипеда Арендатор оплачивает ремонт по прайсу: прокол колеса — 300 сом; погнутое колесо / восьмёрка — 1500 сом; сломанный переключатель — 600 сом; порванное седло — 1000 сом; потеря замка/фары — 1000 сом. Поломка электроники — 50% стоимости ремонта; механических частей — полностью. Замену батареи производит Арендодатель бесплатно.',
        `4.2. При утере / краже / полной поломке по вине Арендатора — Арендатор возмещает полную стоимость велосипеда: ${r.bikeValue ? formatPrice(r.bikeValue) : '______ сом'}.`,
        '4.3. Залог не покрывает полную стоимость ущерба и идёт в счёт его оплаты.',
      ],
    ],
    ['5. Прочее', ['5.1. Арендодатель не несёт ответственности за травмы Арендатора во время катания.', '5.2. Арендатор согласен на передачу паспортных данных и местоположения (GPS) для целей аренды.']],
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

        {sections.map(([title, lines]) => (
          <View key={title} style={{ gap: 4 }}>
            <Text style={styles.h}>{title}</Text>
            {lines.map((t, i) => (
              <Text key={i} style={styles.text}>
                {t}
              </Text>
            ))}
          </View>
        ))}

        <Text style={styles.h}>АКТ ПРИЁМА-ПЕРЕДАЧИ</Text>
        <Text style={styles.text}>
          Велосипед осмотрен. На момент выдачи имеет дефекты: [{r.handoverDefects === 'scratches' ? 'x' : ' '}] царапины [{r.handoverDefects === 'none' ? 'x' : ' '}] нет дефектов
          {r.handoverNote ? ` / описание: ${r.handoverNote}` : ''}.
        </Text>
        <Text style={styles.text}>Тормоза, колёса, передачи — {r.handoverOk === false ? 'есть замечания' : 'исправны'}.</Text>
        <Text style={styles.text}>
          Выдал: {r.staffName || '__________'} · Принял: {p?.fullName || r.name}. Арендатор подтверждает, что с правилами согласен (принято в приложении Jorgo {d(r.createdAt)}).
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
