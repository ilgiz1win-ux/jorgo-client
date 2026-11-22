import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Chip } from '../../components/ui';
import { isRemote } from '../../config/backend';
import { colors, radius } from '../../config/theme';
import { useCatalog } from '../../context/CatalogContext';
import type { IconName } from '../../data/products';
import { fetchStats, Stats } from '../../lib/analytics';

const PERIODS = [7, 30];
const PLATFORM_LABEL: Record<string, string> = { web: 'Сайт (браузер)', pwa: 'Орнотулган колдонмо (сайт)', android: 'Android колдонмо (APK)', ios: 'iPhone колдонмо' };
const WEEKDAY = ['Жш', 'Дш', 'Шш', 'Шр', 'Бш', 'Жм', 'Иш'];

const fmtDay = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
};

function Tile({ icon, value, label, sub }: { icon: IconName; value: number | string; label: string; sub?: string }) {
  return (
    <View style={styles.tile}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
      {!!sub && <Text style={styles.tileSub}>{sub}</Text>}
    </View>
  );
}

// Күн сайын канча адам кирди: бир түстөгү мамычалар, басканда так саны көрүнөт
function DailyChart({ daily }: { daily: Stats['daily'] }) {
  const [sel, setSel] = useState<number | null>(null);
  const max = Math.max(1, ...daily.map((d) => d.visitors));
  const niceMax = max <= 5 ? max : Math.ceil(max / 5) * 5;
  const last = daily.length - 1;
  const showIdx = sel ?? last;
  const many = daily.length > 10;

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.chartHead}>
        <Text style={styles.chartValue}>{daily[showIdx]?.visitors ?? 0} адам</Text>
        <Text style={styles.chartDay}>{daily[showIdx] ? fmtDay(daily[showIdx].day) : ''}{sel === null ? ' (бүгүн)' : ''}</Text>
      </View>
      <View style={styles.chart}>
        <View style={styles.gridTop}>
          <Text style={styles.axisText}>{niceMax}</Text>
        </View>
        <View style={styles.bars}>
          {daily.map((d, i) => {
            const h = Math.round((d.visitors / niceMax) * 120);
            const on = i === showIdx;
            return (
              <Pressable
                key={d.day}
                style={styles.barSlot}
                onPress={() => setSel(i === sel ? null : i)}
                accessibilityLabel={`${fmtDay(d.day)}: ${d.visitors} адам`}
              >
                <View style={[styles.bar, { height: Math.max(h, d.visitors ? 3 : 0), opacity: on ? 1 : 0.55, maxWidth: many ? 14 : 24 }]} />
              </Pressable>
            );
          })}
        </View>
        <View style={styles.baseline} />
        <View style={styles.labels}>
          {daily.map((d, i) => {
            const show = !many || i === 0 || i === last || i % 7 === last % 7;
            const date = new Date(d.day + 'T00:00:00');
            return (
              <Text key={d.day} style={[styles.axisText, styles.barLabel]} numberOfLines={1}>
                {show ? (many ? fmtDay(d.day) : WEEKDAY[date.getDay()]) : ''}
              </Text>
            );
          })}
        </View>
      </View>
      <Text style={styles.hint}>Мамычаны басып, ошол күндүн санын көрүңүз.</Text>
    </View>
  );
}

// Туурасынан мамычалар (бир түс; аты текст менен жазылат)
function BarList({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <View style={{ gap: 12 }}>
      {rows.map((r, i) => (
        <View key={i} style={{ gap: 4 }}>
          <View style={styles.rowHead}>
            <Text style={styles.rowLabel} numberOfLines={1}>
              {r.label}
            </Text>
            <Text style={styles.rowValue}>{r.value}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.max(3, (r.value / max) * 100)}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function AdminStats() {
  const { getProduct } = useCatalog();
  const [days, setDays] = useState(7);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isRemote) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setStats(await fetchStats(days));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes('admin_stats') || msg.includes('function') ? 'Статистика үчүн SQL иштетиле элек (005_stats.sql).' : 'Жүктөлгөн жок: ' + msg);
    }
    setLoading(false);
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  if (!isRemote) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>Статистика сервер (Supabase) туташканда иштейт.</Text>
      </View>
    );
  }

  const diff = stats ? stats.today_visitors - stats.yesterday_visitors : 0;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {PERIODS.map((p) => (
          <Chip key={p} label={`${p} күн`} active={days === p} onPress={() => setDays(p)} />
        ))}
      </View>

      {error && <Text style={{ color: colors.danger }}>{error}</Text>}
      {loading && !stats && <ActivityIndicator color={colors.primary} />}

      {stats && (
        <>
          <View style={styles.tiles}>
            <Tile
              icon="account-group"
              value={stats.today_visitors}
              label="Бүгүн кирди"
              sub={`кечээ ${stats.yesterday_visitors}${diff ? ` (${diff > 0 ? '+' : ''}${diff})` : ''}`}
            />
            <Tile icon="calendar-range" value={stats.period_visitors} label={`${days} күндө`} sub="ар бири бир жолу" />
            <Tile icon="whatsapp" value={stats.orders} label="Буйрутма" sub={`${days} күндө`} />
            <Tile icon="wrench" value={stats.repairs} label="Оңдоого өтүнмө" sub={`${days} күндө`} />
            <Tile icon="bicycle-electric" value={stats.rents ?? 0} label="Ижарага өтүнмө" sub={`${days} күндө`} />
          </View>

          <Card style={{ gap: 12 }}>
            <Text style={styles.h}>Точкалар боюнча ({days} күндө)</Text>
            {stats.branches?.length ? (
              stats.branches.map((b) => (
                <View key={b.branch} style={styles.branchRow}>
                  <MaterialCommunityIcons name="store-marker" size={20} color={colors.primary} />
                  <Text style={styles.rowLabel} numberOfLines={1}>
                    {b.branch}
                  </Text>
                  <Text style={styles.branchNum}>🛒 {b.orders}</Text>
                  <Text style={styles.branchNum}>🔧 {b.repairs}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.hint}>Азырынча маалымат жок. Кардарлар точканы тандап заказ бергенде бул жерде көрүнөт.</Text>
            )}
          </Card>

          <Card style={{ gap: 10 }}>
            <Text style={styles.h}>Күн сайын канча адам кирди</Text>
            <DailyChart daily={stats.daily} />
          </Card>

          <Card style={{ gap: 12 }}>
            <Text style={styles.h}>Эң көп каралган товарлар</Text>
            {stats.top_products.length ? (
              <BarList rows={stats.top_products.map((p) => ({ label: getProduct(p.id)?.name ?? 'Өчүрүлгөн товар', value: p.views }))} />
            ) : (
              <Text style={styles.hint}>Азырынча маалымат жок</Text>
            )}
          </Card>

          <Card style={{ gap: 12 }}>
            <Text style={styles.h}>Кайдан киришти</Text>
            {Object.keys(stats.platforms).length ? (
              <BarList
                rows={Object.entries(stats.platforms)
                  .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
                  .map(([k, v]) => ({ label: PLATFORM_LABEL[k] ?? k, value: v ?? 0 }))}
              />
            ) : (
              <Text style={styles.hint}>Азырынча маалымат жок</Text>
            )}
          </Card>

          <Text style={styles.hint}>
            Ар бир телефон бир жолу эсептелет. Сиз (админ) кирген түзмөк эсептелбейт. Кардарлардын аты же номери сакталбайт. Ылдый тартып жаңыртыңыз.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  h: { fontSize: 16, fontWeight: '800', color: colors.text },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, gap: 2, borderWidth: 1, borderColor: colors.border },
  tileValue: { fontSize: 28, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'], marginTop: 4 },
  tileLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  tileSub: { fontSize: 12, color: colors.muted },
  chartHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  chartValue: { fontSize: 22, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] },
  chartDay: { fontSize: 13, color: colors.muted },
  chart: { paddingTop: 16 },
  gridTop: { position: 'absolute', top: 0, left: 0, right: 0, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 2 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 124, gap: 2 },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '100%', backgroundColor: colors.primary, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  baseline: { height: 1, backgroundColor: colors.border },
  labels: { flexDirection: 'row', gap: 2, marginTop: 4 },
  barLabel: { flex: 1, textAlign: 'center' },
  axisText: { fontSize: 11, color: colors.muted, fontVariant: ['tabular-nums'] },
  branchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border },
  branchNum: { fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'], minWidth: 48, textAlign: 'right' },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  rowLabel: { flex: 1, color: colors.text, fontSize: 14 },
  rowValue: { color: colors.text, fontWeight: '800', fontVariant: ['tabular-nums'] },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.bg },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
});
