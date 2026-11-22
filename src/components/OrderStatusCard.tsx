import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../config/theme';
import type { IconName } from '../data/products';
import { TKey, useT } from '../i18n';
import { formatPrice } from '../lib/format';
import { ORDER_STEPS, ServerOrder } from '../lib/orders';

const ICON: Record<string, IconName> = { new: 'check-circle', picked_up: 'truck-fast', delivered: 'package-variant-closed-check' };
const fmt = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Экспресс заказынын картасы: абал (кадамдар), товардын суммасы, жол акысы, жалпы
export function OrderStatusCard({ order, children }: { order: ServerOrder; children?: ReactNode }) {
  const { t } = useT();
  const cancelled = order.status === 'cancelled';
  const at = ORDER_STEPS.indexOf(order.status);
  const times: Record<string, string | undefined> = { new: order.createdAt, picked_up: order.pickedUpAt, delivered: order.deliveredAt };
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.number}>№{order.number}</Text>
        <Text style={styles.date}>{fmt(order.createdAt)}</Text>
      </View>

      {cancelled ? (
        <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
          <Text style={{ color: colors.danger, fontWeight: '800' }}>{t('order.status.cancelled')}</Text>
        </View>
      ) : (
        <View style={{ gap: 0 }}>
          {ORDER_STEPS.map((s, i) => {
            const done = i <= at;
            return (
              <View key={s} style={styles.step}>
                <View style={{ alignItems: 'center' }}>
                  <View style={[styles.dot, done && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                    <MaterialCommunityIcons name={ICON[s]} size={14} color={done ? '#fff' : colors.muted} />
                  </View>
                  {i < ORDER_STEPS.length - 1 && <View style={[styles.bar, i < at && { backgroundColor: colors.primary }]} />}
                </View>
                <View style={{ flex: 1, paddingBottom: 10 }}>
                  <Text style={[styles.stepText, done && { color: colors.text }]}>{t(`order.status.${s}` as TKey)}</Text>
                  {done && !!times[s] && <Text style={styles.date}>{fmt(times[s])}</Text>}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={{ gap: 2 }}>
        {order.items.map((it, i) => (
          <Text key={i} style={styles.item}>
            • {it.name} × {it.qty}
          </Text>
        ))}
        {!!order.address && <Text style={styles.date}>📍 {order.address}</Text>}
      </View>

      <View style={styles.sums}>
        <View style={styles.row}>
          <Text style={styles.muted}>{t('order.goods')}</Text>
          <Text style={styles.val}>{formatPrice(order.goodsTotal)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.muted}>{t('order.fee')}</Text>
          <Text style={[styles.val, order.expressFee == null && { color: '#B45309' }]}>
            {order.expressFee == null ? t('order.feeUnknown') : formatPrice(order.expressFee)}
          </Text>
        </View>
        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.total}>{t('order.total')}</Text>
          <Text style={[styles.total, { color: colors.primary }]}>{formatPrice(order.goodsTotal + (order.expressFee ?? 0))}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 22, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  number: { fontSize: 17, fontWeight: '900', color: colors.text },
  date: { fontSize: 12, color: colors.muted },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  step: { flexDirection: 'row', gap: 10 },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  bar: { width: 2, flex: 1, minHeight: 14, backgroundColor: colors.border },
  stepText: { fontSize: 14, fontWeight: '700', color: colors.muted, marginTop: 3 },
  item: { fontSize: 14, color: colors.text },
  sums: { backgroundColor: colors.bg, borderRadius: 14, padding: 12, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  muted: { color: colors.muted },
  val: { fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 },
  total: { fontSize: 16, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] },
});
