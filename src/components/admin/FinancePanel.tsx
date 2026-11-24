import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { ComponentProps, useCallback, useState, ReactNode } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Chip } from '../../components/ui';
import { colors, radius } from '../../config/theme';
import { Finance, fetchFinance } from '../../lib/finance';
import { fmtSom } from '../../lib/wallet';

type Icon = ComponentProps<typeof MaterialCommunityIcons>['name'];
const PERIODS: [number, string][] = [
  [1, 'Бүгүн'],
  [7, '7 күн'],
  [30, '30 күн'],
  [0, 'Бардыгы'],
];

function Big({ icon, label, value, color, sub }: { icon: Icon; label: string; value: string; color: string; sub?: string }) {
  return (
    <View style={[styles.big, { borderColor: color }]}>
      <MaterialCommunityIcons name={icon} size={22} color={color} />
      <Text style={[styles.bigValue, { color }]}>{value}</Text>
      <Text style={styles.bigLabel}>{label}</Text>
      {!!sub && <Text style={styles.bigSub}>{sub}</Text>}
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && { color: colors.text, fontWeight: '800' }]}>{label}</Text>
      <Text style={[styles.rowValue, bold && { fontWeight: '900' }]}>{value}</Text>
    </View>
  );
}

// Админ: акча кайдан түштү, сатуулар, оңдоо, ижарадагы велосипеддер — баары бир жерде

// Өзүнчө экранда — ScrollView, башкы бетте — жөн гана блок
function Wrap({ embedded, loading, onRefresh, gap, children }: { embedded: boolean; loading: boolean; onRefresh: () => void; gap: number; children: ReactNode }) {
  if (embedded) return <View style={{ gap }}>{children}</View>;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}>
      {children}
    </ScrollView>
  );
}

export function FinancePanel({ embedded = false }: { embedded?: boolean }) {
  const [days, setDays] = useState(30);
  const [f, setF] = useState<Finance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setF(await fetchFinance(days));
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setError(m.includes('admin_finance') ? 'SQL иштетиле элек (030a–030c).' : m);
    }
    setLoading(false);
  }, [days]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const topupsSum = f ? f.topups.reduce((s, x) => s + x.sum, 0) : 0;
  const earned = f ? f.income.rent + f.income.outcall + f.income.damage + f.orders.soldSum : 0;
  const free = f ? Math.max(0, f.bikes.total - f.bikes.busy) : 0;

  return (
    <Wrap embedded={embedded} loading={loading} onRefresh={load} gap={12}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {PERIODS.map(([d, l]) => (
          <Chip key={d} label={l} active={days === d} onPress={() => setDays(d)} />
        ))}
      </View>
      {error && <Text style={{ color: colors.danger }}>{error}</Text>}
      {f && (
        <>
          <View style={styles.grid}>
            <Big icon="cash-plus" label="Кардарлар салды" value={fmtSom(topupsSum)} color={colors.success} sub={f.topupsPending.count ? `+ ${f.topupsPending.count} текшерилүүдө (${fmtSom(f.topupsPending.sum)})` : undefined} />
            <Big icon="chart-line" label="Тапкан киреше" value={fmtSom(earned)} color={colors.primary} sub="ижара + выезд + зыян + сатуу" />
            <Big icon="bicycle-electric" label="Ижарада жүрөт" value={`${f.bikes.busy} / ${f.bikes.total}`} color="#2563EB" sub={`бош: ${free}${f.bikes.waiting ? ` · күтүүдө: ${f.bikes.waiting}` : ''}`} />
            <Big icon="alert-circle-outline" label="Кардарлардын карызы" value={fmtSom(f.balances.debt)} color={f.balances.debt ? colors.danger : colors.muted} sub={`${f.balances.debtors} кардар`} />
          </View>

          <Card style={{ gap: 4 }}>
            <Text style={styles.h}>💰 Акча кайдан түштү (балансты толуктоо)</Text>
            {f.topups.length === 0 && <Text style={styles.muted}>Бул мезгилде толуктоо жок</Text>}
            {f.topups.map((x) => (
              <Row key={x.method} label={`${x.method} · ${x.count} жолу`} value={fmtSom(x.sum)} />
            ))}
            {f.topups.length > 0 && <Row label="Бардыгы" value={fmtSom(topupsSum)} bold />}
            <Pressable onPress={() => router.push('/admin/wallets')}>
              <Text style={styles.link}>Толуктоолорду ырастоо →</Text>
            </Pressable>
          </Card>

          <Card style={{ gap: 4 }}>
            <Text style={styles.h}>📈 Киреше (эмнеден тапты)</Text>
            <Row label="🚲 Ижара (күнүмдүк акы)" value={fmtSom(f.income.rent)} />
            <Row label="🚗 Выезд акысы" value={fmtSom(f.income.outcall)} />
            <Row label="⚠️ Зыян (ижарадан)" value={fmtSom(f.income.damage)} />
            <Row label="🛒 Товар сатуу (алып кетти / жеткирилди)" value={fmtSom(f.orders.soldSum)} />
            <Row label="Бардыгы" value={fmtSom(earned)} bold />
            {f.income.adjust !== 0 && <Text style={styles.muted}>Админ кол менен өзгөрткөн баланс: {fmtSom(f.income.adjust)}</Text>}
          </Card>

          <Card style={{ gap: 4 }}>
            <Text style={styles.h}>🛒 Соода (товар заказдары)</Text>
            <Row label="Бардык заказ" value={String(f.orders.count)} />
            <Row label="Сатылды" value={`${f.orders.sold} · ${fmtSom(f.orders.soldSum)}`} />
            <Row label="Күтүүдө (жаңы)" value={`${f.orders.pending} · ${fmtSom(f.orders.pendingSum)}`} />
            <Row label="Отказ" value={String(f.orders.cancelled)} />
            {f.orders.expressFees > 0 && <Row label="Экспресс жол акысы" value={fmtSom(f.orders.expressFees)} />}
            {f.ordersByBranch.length > 0 && <Text style={[styles.sub, { marginTop: 6 }]}>Точкалар боюнча</Text>}
            {f.ordersByBranch.map((b) => (
              <Row key={b.branch} label={`📍 ${b.branch} · ${b.count}`} value={fmtSom(b.sum)} />
            ))}
            {f.topItems.length > 0 && <Text style={[styles.sub, { marginTop: 6 }]}>Эң көп сатылгандар</Text>}
            {f.topItems.map((x, i) => (
              <Row key={x.name} label={`${i + 1}. ${x.name} × ${x.qty}`} value={fmtSom(x.sum)} />
            ))}
            <Pressable onPress={() => router.push('/admin/orders')}>
              <Text style={styles.link}>Заказдар →</Text>
            </Pressable>
          </Card>

          <Card style={{ gap: 4 }}>
            <Text style={styles.h}>🔧 Оңдоо жана выезд</Text>
            <Row label="Бардык заказ" value={`${f.repairs.count} (выезд: ${f.repairs.outcalls})`} />
            <Row label="Бүттү" value={String(f.repairs.done)} />
            <Row label="Азыр иштелүүдө" value={String(f.repairs.active)} />
            <Row label="Жаңы (алына элек)" value={String(f.repairs.new)} />
            <Row label="Отказ" value={String(f.repairs.cancelled)} />
          </Card>

          <Card style={{ gap: 6 }}>
            <Text style={styles.h}>🚲 Велосипеддер: {f.bikes.busy} ижарада · {free} бош</Text>
            {f.bikesList.map((b) => (
              <View key={b.id} style={[styles.bike, { borderLeftColor: b.renter ? '#2563EB' : colors.success }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ flex: 1, fontWeight: '800', color: colors.text }}>{b.name}</Text>
                  <Text style={[styles.badge, { backgroundColor: b.renter ? '#2563EB' : b.available ? colors.success : colors.muted }]}>{b.renter ? 'Ижарада' : b.available ? 'Бош' : 'Жашырылган'}</Text>
                </View>
                {!!b.renter && (
                  <Pressable onPress={() => b.phone && Linking.openURL(`tel:${b.phone.replace(/[^\d+]/g, '')}`)}>
                    <Text style={styles.muted}>
                      👤 {b.renter} · {b.phone}
                      {b.contract ? ` · №${b.contract}` : ''}
                      {b.since ? ` · ${new Date(b.since).toLocaleDateString('ru-RU')} бери` : ''}
                      {b.days != null ? ` · ${b.days} күн` : ''}
                      {b.daily ? ` · ${fmtSom(b.daily)}/күн` : ''}
                    </Text>
                  </Pressable>
                )}
              </View>
            ))}
            <Pressable onPress={() => router.push('/admin/rent-requests')}>
              <Text style={styles.link}>Ижаралар →</Text>
            </Pressable>
          </Card>

          <Card style={{ gap: 4 }}>
            <Text style={styles.h}>👛 Кардарлардын балансы</Text>
            <Row label="Баарынын балансында" value={fmtSom(f.balances.total)} />
            <Row label="Карыз (минустагылар)" value={`${fmtSom(f.balances.debt)} · ${f.balances.debtors} кардар`} />
            <Text style={styles.muted}>Баланстагы акча — кардарлардын алдын ала төлөгөнү (ижара жана выезд үчүн).</Text>
          </Card>
        </>
      )}
    </Wrap>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  big: { flexGrow: 1, flexBasis: '45%', backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1.5, padding: 12, gap: 2 },
  bigValue: { fontSize: 20, fontWeight: '900' },
  bigLabel: { fontSize: 13, color: colors.text, fontWeight: '700' },
  bigSub: { fontSize: 11, color: colors.muted },
  h: { fontSize: 16, fontWeight: '900', color: colors.text, marginBottom: 4 },
  sub: { fontSize: 13, fontWeight: '800', color: colors.muted },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { flex: 1, color: colors.muted, fontSize: 14 },
  rowValue: { color: colors.text, fontWeight: '700', fontSize: 14 },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  link: { color: '#2563EB', fontWeight: '800', marginTop: 6 },
  bike: { gap: 2, borderLeftWidth: 4, paddingLeft: 10, paddingVertical: 4 },
  badge: { color: '#fff', fontWeight: '800', fontSize: 11, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
});
