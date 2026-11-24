import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DEFAULT_LESSOR, getLessor, Lessor } from '../../lib/lessor';
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
  const [l, setL] = useState<Lessor>(DEFAULT_LESSOR);
  useEffect(() => {
    getLessor().then(setL).catch(() => {});
  }, []);
  const lessorLine = [l.name, l.inn && `ИНН ${l.inn}`, l.address, l.phone && `тел. ${l.phone}`].filter(Boolean).join(', ');
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
    ['5. Ответственность за травмы', ['5.1. Арендодатель не несёт ответственности за травмы Арендатора и вред, причинённый Арендатором третьим лицам во время катания.']],
    [
      '6. Расчёты и задолженность',
      [
        '6.1. Арендатор поручает Арендодателю ежедневно списывать арендную плату, а также суммы ущерба по разделу 4, с баланса Арендатора в приложении Jorgo. История списаний доступна Арендатору в приложении.',
        '6.2. Если баланса недостаточно, образовавшаяся сумма является задолженностью Арендатора перед Арендодателем и подлежит оплате в течение 3 (трёх) календарных дней с момента уведомления.',
        '6.3. Арендатор обязан вернуть велосипед в течение 1 (одних) суток после требования Арендодателя при задолженности по оплате.',
      ],
    ],
    [
      '7. Порядок разрешения споров',
      [
        '7.1. Споры по настоящему договору стороны решают путём переговоров. Претензия направляется письменно (в том числе через приложение Jorgo или мессенджер по указанным телефонам) и рассматривается в течение 10 (десяти) календарных дней.',
        `7.2. При недостижении согласия спор рассматривается в суде по месту нахождения Арендодателя (${l.city}) в соответствии с законодательством Кыргызской Республики.`,
        '7.3. Во всём, что не предусмотрено договором, стороны руководствуются Гражданским кодексом Кыргызской Республики и иным законодательством Кыргызской Республики.',
      ],
    ],
    [
      '8. Персональные данные и заключительные положения',
      [
        '8.1. В соответствии с Законом Кыргызской Республики «Об информации персонального характера» Арендатор даёт согласие Арендодателю на сбор, хранение и обработку своих персональных данных (ФИО, паспортные данные, адрес, телефоны, фото документов, местоположение GPS) в целях заключения и исполнения настоящего договора, а также их передачу в суд и правоохранительные органы при неисполнении договора.',
        '8.2. Договор вступает в силу с момента выдачи велосипеда и действует до его возврата и полного расчёта сторон.',
        '8.3. Договор составлен в двух экземплярах, имеющих одинаковую юридическую силу, по одному для каждой стороны. Электронная копия договора хранится в приложении Jorgo; принятие условий Арендатором в приложении фиксируется с датой и временем.',
      ],
    ],
  ];
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <View style={styles.paper}>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Image source={LOGO} style={{ width: 140, height: 76 }} resizeMode="contain" />
          <Text style={styles.title}>ДОГОВОР АРЕНДЫ ВЕЛОСИПЕДА № {r.contractNo ?? '—'}</Text>
          <Text style={styles.muted}>
            {l.city} · Дата: {d(r.startedAt ?? r.createdAt)}
          </Text>
        </View>

        <Text style={styles.text}>
          {lessorLine || 'Jorgo Eco Service'}, именуемый в дальнейшем «Арендодатель», с одной стороны, и {p?.fullName || r.name}, именуемый(ая) в дальнейшем «Арендатор», с другой стороны, заключили настоящий договор в соответствии с Гражданским кодексом Кыргызской Республики (договор имущественного найма) о нижеследующем.
        </Text>

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
            <Text style={styles.text}>Арендодатель: {l.name}</Text>
            {!!r.staffName && <Text style={styles.muted}>в лице: {r.staffName}</Text>}
            <View style={styles.signLine} />
            <Text style={styles.muted}>(подпись) · М.П.</Text>
          </View>
          <View style={styles.sign}>
            <Text style={styles.text}>Арендатор: {p?.fullName || r.name}</Text>
            <Text style={styles.muted}>паспорт {p?.passportNo || r.passport}</Text>
            <View style={styles.signLine} />
            <Text style={styles.muted}>(подпись)</Text>
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
