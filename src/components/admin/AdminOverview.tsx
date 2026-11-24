import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../config/theme';
import { formatPrice } from '../../lib/format';
import { fetchOverview, Money, Overview } from '../../lib/overview';
import { Chip } from '../ui';

const WD = ['Жк', 'Дш', 'Шш', 'Шр', 'Бш', 'Жм', 'Иш'];
const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')} ${WD[dt.getDay()]}`;
};
const parts = (m: Money) =>
  [
    m.sales ? `🛒 ${formatPrice(m.sales)}` : '',
    m.repair ? `🔧 ${formatPrice(m.repair)}` : '',
    m.outcall ? `🚗 ${formatPrice(m.outcall)}` : '',
    m.rent ? `🚲 ${formatPrice(m.rent)}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

// Админдин башкы бети: кайсы точкада канча акча (бүгүн / ушул ай), күн сайын, мастерлер канча иштеди
export function AdminOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'today' | 'month'>('today');
  const [showDays, setShowDays] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const load = () =>
        fetchOverview()
          .then((d) => {
            setData(d);
            setError(null);
          })
          .catch((e) => {
            const m = e instanceof Error ? e.message : String(e);
            setError(m.includes('admin_overview') ? 'SQL 033 иштетиле элек — сандар көрүнүшү үчүн 033_admin_overview.sql иштетиңиз.' : m);
          });
      load();
      const id = setInterval(load, 60000);
      return () => clearInterval(id);
    }, []),
  );

  if (error) return <Text style={styles.err}>{error}</Text>;
  if (!data) return <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />;

  const total = period === 'today' ? data.totalToday : data.totalMonth;
  const maxDay = Math.max(1, ...data.days.map((d) => d.sum));
  const mc = data.mastersCount;

  return (
    <View style={{ gap: 12 }}>
      {/* Акча */}
      <View style={styles.card}>
        <View style={styles.row}>
          <MaterialCommunityIcons name="cash-multiple" size={22} color={colors.primary} />
          <Text style={styles.h}>Акча</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginLeft: 'auto' }}>
            <Chip label="Бүгүн" active={period === 'today'} onPress={() => setPeriod('today')} />
            <Chip label="Ушул ай" active={period === 'month'} onPress={() => setPeriod('month')} />
          </View>
        </View>
        <Text style={styles.big}>{formatPrice(total)}</Text>
        <Text style={styles.muted}>{period === 'today' ? 'Бүгүн бардык точкалардан түштү' : 'Ушул айда бардык точкалардан түштү'}</Text>

        {data.branches.length === 0 && <Text style={styles.muted}>Азырынча киреше жок.</Text>}
        {[...data.branches].sort((x, y) => Number(x.branch === 'Ижара') - Number(y.branch === 'Ижара') || y[period].total - x[period].total).map((b) => {
          const m = period === 'today' ? b.today : b.month;
          return (
            <View key={b.branch} style={styles.branch}>
              <View style={styles.row}>
                <MaterialCommunityIcons name={b.branch === 'Ижара' ? 'bicycle-electric' : 'store-marker'} size={18} color={colors.muted} />
                <Text style={styles.bName} numberOfLines={1}>
                  {b.branch}
                </Text>
                <Text style={styles.bSum}>{formatPrice(m.total)}</Text>
              </View>
              {!!parts(m) && <Text style={styles.small}>{parts(m)}</Text>}
              {period === 'today' && <Text style={styles.small}>Ушул ай: {formatPrice(b.month.total)}</Text>}
            </View>
          );
        })}
        <Text style={styles.legend}>🛒 товар · 🔧 оңдоо · 🚗 выезд · 🚲 ижара</Text>
        {data.unassignedDone.noPrice > 0 && (
          <Text style={styles.warn}>⚠️ Ушул айда {data.unassignedDone.noPrice} оңдоонун акысы жазылган эмес — «Оңдоо жана выезд заказдары» бөлүмүнөн жазыңыз.</Text>
        )}

        <Pressable onPress={() => setShowDays((v) => !v)} style={styles.toggle}>
          <Text style={{ color: colors.primary, fontWeight: '800' }}>📅 Күн сайын (14 күн)</Text>
          <MaterialCommunityIcons name={showDays ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
        </Pressable>
        {showDays &&
          data.days.map((d) => (
            <View key={d.day} style={styles.dayRow}>
              <Text style={styles.dayL}>{dayLabel(d.day)}</Text>
              <View style={styles.barBg}>
                <View style={[styles.bar, { width: `${Math.max(d.sum > 0 ? 3 : 0, (d.sum / maxDay) * 100)}%` }]} />
              </View>
              <Text style={styles.dayS}>{formatPrice(d.sum)}</Text>
            </View>
          ))}
      </View>

      {/* Мастерлер */}
      <View style={styles.card}>
        <View style={styles.row}>
          <MaterialCommunityIcons name="account-hard-hat" size={22} color="#B45309" />
          <Text style={styles.h}>Мастерлер: {mc.total}</Text>
        </View>
        <Text style={styles.muted}>
          Иштеп жатат {mc.active} · выездге чыгат {mc.outcall}
          {mc.panel ? ` · панели ачык ${mc.panel}` : ''}
        </Text>
        <View style={styles.row}>
          <Text style={[styles.pill, { backgroundColor: '#DBEAFE', color: '#1D4ED8' }]}>Жаңы заказ: {data.repairsToday.new}</Text>
          <Text style={[styles.pill, { backgroundColor: '#FEF3C7', color: '#92400E' }]}>Иштелүүдө: {data.repairsToday.active}</Text>
          <Text style={[styles.pill, { backgroundColor: '#DCFCE7', color: '#166534' }]}>Бүгүн бүттү: {data.repairsToday.done}</Text>
        </View>
        <View style={[styles.mRow, styles.mHead]}>
          <Text style={[styles.mName, styles.th]}>Мастер</Text>
          <Text style={[styles.mN, styles.th]}>Бүгүн</Text>
          <Text style={[styles.mN, styles.th]}>Ай</Text>
          <Text style={[styles.mSum, styles.th]}>Айына, сом</Text>
        </View>
        {data.masters.map((m) => (
          <Pressable key={m.id} style={styles.mRow} onPress={() => router.push({ pathname: '/admin/master/[id]', params: { id: m.id } })}>
            <View style={styles.mName}>
              <Text style={{ fontWeight: '800', color: m.active ? colors.text : colors.muted }} numberOfLines={1}>
                {m.name}
              </Text>
              <Text style={styles.small} numberOfLines={1}>
                {[m.branch || '—', m.rating ? `⭐ ${Number(m.rating).toFixed(1)}` : '', m.activeNow ? `🔧 азыр ${m.activeNow}` : '', m.outcall ? '🚗' : '', !m.active ? 'жашырылган' : ''].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Text style={styles.mN}>{m.todayDone}</Text>
            <Text style={styles.mN}>{m.monthDone}</Text>
            <Text style={[styles.mSum, { color: colors.success }]}>{formatPrice(m.monthSum).replace(' сом', '')}</Text>
          </Pressable>
        ))}
        {data.masters.length === 0 && <Text style={styles.muted}>Мастер кошула элек.</Text>}
        <Text style={styles.small}>Бүгүн / Ай — бүткөн заказдар саны. Сумма — мастер жазган оңдоо акысы.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, gap: 8, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  h: { fontSize: 17, fontWeight: '900', color: colors.text },
  big: { fontSize: 30, fontWeight: '900', color: colors.success },
  muted: { color: colors.muted, fontSize: 13 },
  small: { color: colors.muted, fontSize: 12 },
  legend: { color: colors.muted, fontSize: 11 },
  err: { color: colors.danger, fontWeight: '700', backgroundColor: '#FEF2F2', padding: 10, borderRadius: radius.md },
  warn: { color: '#92400E', fontSize: 13, fontWeight: '700', backgroundColor: '#FEF3C7', padding: 8, borderRadius: radius.md },
  branch: { backgroundColor: colors.bg, borderRadius: radius.md, padding: 10, gap: 2 },
  bName: { flex: 1, fontWeight: '800', color: colors.text, fontSize: 15 },
  bSum: { fontWeight: '900', color: colors.text, fontSize: 16 },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayL: { width: 66, fontSize: 12, color: colors.muted },
  barBg: { flex: 1, height: 10, backgroundColor: colors.bg, borderRadius: 5, overflow: 'hidden' },
  bar: { height: 10, backgroundColor: colors.primary, borderRadius: 5 },
  dayS: { width: 84, textAlign: 'right', fontSize: 12, fontWeight: '800', color: colors.text },
  link: { color: colors.primary, fontWeight: '800', marginTop: 4 },
  pill: { fontSize: 12, fontWeight: '800', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden' },
  mRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  mHead: { paddingVertical: 4 },
  th: { fontSize: 11, color: colors.muted, fontWeight: '800' },
  mName: { flex: 1, gap: 1 },
  mN: { width: 44, textAlign: 'center', fontWeight: '900', color: colors.text },
  mSum: { width: 78, textAlign: 'right', fontWeight: '900', color: colors.text },
});
