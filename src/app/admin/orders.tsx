import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { OrderStatusCard } from '../../components/OrderStatusCard';
import { Chip } from '../../components/ui';
import { colors, radius } from '../../config/theme';
import { formatPrice, openWhatsApp } from '../../lib/format';
import { addToBlacklist, fetchBlacklist, fetchOrders, OrderStatus, phone9, ServerOrder, updateOrder } from '../../lib/orders';

const LABEL: Record<OrderStatus, string> = { new: 'Жаңы', picked_up: 'Алып кетти', delivered: 'Жеткирилди', cancelled: 'Отказ кылды' };
const actionLabel = (o: ServerOrder, s: OrderStatus) =>
  s === 'picked_up' ? (o.delivery === 'express' ? '🚚 Экспресс алып кетти' : '✅ Кардар алып кетти') : s === 'delivered' ? '📦 Жеткирилди' : '✖ Отказ кылды';
const COLOR: Record<OrderStatus, string> = { new: '#2563EB', picked_up: '#D97706', delivered: colors.success, cancelled: colors.danger };
const FILTERS: (OrderStatus | 'all')[] = ['new', 'picked_up', 'delivered', 'cancelled', 'all'];

// Кардарга WhatsApp аркылуу абалын жана суммаларды жөнөтүү үчүн текст
const summary = (o: ServerOrder) =>
  [
    `Jorgo · заказ №${o.number}`,
    `Абалы: ${LABEL[o.status]}${o.status === 'cancelled' && o.cancelReason ? ` (${o.cancelReason})` : ''}`,
    `Товар: ${formatPrice(o.goodsTotal)}`,
    o.delivery === 'express' ? `Жол акысы: ${o.expressFee == null ? 'экспресс айта элек' : formatPrice(o.expressFee)}` : null,
    o.delivery === 'express' ? `Жалпы: ${formatPrice(o.goodsTotal + (o.expressFee ?? 0))}` : null,
  ]
    .filter(Boolean)
    .join('\n');

function Controls({ o, onChange, blacklisted, onBlacklist }: { o: ServerOrder; onChange: (n: ServerOrder) => void; blacklisted: boolean; onBlacklist: () => void }) {
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState('');
  const [fee, setFee] = useState(o.expressFee != null ? String(o.expressFee) : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const apply = async (patch: { status?: OrderStatus; expressFee?: number | null; cancelReason?: string }) => {
    setBusy(true);
    setErr(null);
    try {
      const n = await updateOrder(o.id, patch);
      if (n) onChange(n);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ката кетти');
    }
    setBusy(false);
  };
  const feeNum = fee.trim() ? Math.max(0, parseInt(fee.replace(/\D/g, ''), 10) || 0) : null;
  const phoneDigits = o.phone.replace(/\D/g, '');

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.contact}>
        <MaterialCommunityIcons name="account" size={18} color={colors.muted} />
        <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>
          {o.name} · {o.phone}
        </Text>
        <Pressable onPress={() => Linking.openURL(`tel:${o.phone.replace(/[^\d+]/g, '')}`)} hitSlop={8}>
          <MaterialCommunityIcons name="phone" size={22} color={colors.primary} />
        </Pressable>
      </View>
      <Text style={styles.muted}>
        {o.delivery === 'express' ? '📦 Экспресс' : '🏪 Өзү алат'} · Точка: {o.branch || '—'} · Төлөм: {o.payment || '—'}
      </Text>
      {blacklisted && <Text style={{ color: colors.danger, fontWeight: '800' }}>⚫ Бул номер кара тизмеде</Text>}
      {!!o.comment && <Text style={styles.muted}>💬 {o.comment}</Text>}

      {o.delivery === 'express' && (
      <View style={styles.feeBox}>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Жол акысы, сом (экспресс айткан)</Text>
        <View style={styles.feeRow}>
        <TextInput value={fee} onChangeText={setFee} keyboardType="number-pad" placeholder="мисалы 350" placeholderTextColor={colors.muted} style={styles.feeInput} />
        <Pressable disabled={busy || feeNum === (o.expressFee ?? null)} onPress={() => apply({ expressFee: feeNum })} style={[styles.small, { opacity: busy || feeNum === (o.expressFee ?? null) ? 0.4 : 1 }]}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>Сактоо</Text>
        </Pressable>
        </View>
      </View>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {((o.delivery === 'express' ? ['picked_up', 'delivered', 'cancelled'] : ['picked_up', 'cancelled']) as OrderStatus[])
          .filter((s) => s !== o.status)
          .map((s) => (
            <Pressable
              key={s}
              disabled={busy}
              onPress={() => (s === 'cancelled' ? setRefusing(true) : apply({ status: s }))}
              style={[styles.action, { borderColor: COLOR[s] }]}
            >
              <Text style={{ color: COLOR[s], fontWeight: '800', fontSize: 13 }}>{actionLabel(o, s)}</Text>
            </Pressable>
          ))}
        {phoneDigits.length >= 9 && (
          <Pressable onPress={() => openWhatsApp(summary(o), phoneDigits.length === 9 ? '996' + phoneDigits : phoneDigits).catch(() => {})} style={[styles.action, { borderColor: colors.whatsapp }]}>
            <Text style={{ color: colors.whatsapp, fontWeight: '800', fontSize: 13 }}>Кардарга WhatsApp</Text>
          </Pressable>
        )}
      </View>
      {refusing && (
        <View style={styles.refuse}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Отказдын себеби</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {['Экспресстин баасына келишпеди', 'Кардар келген жок', 'Оюн өзгөрттү'].map((r) => (
              <Chip key={r} label={r} active={reason === r} onPress={() => setReason(r)} />
            ))}
          </View>
          <TextInput value={reason} onChangeText={setReason} placeholder="Же өзүңүз жазыңыз" placeholderTextColor={colors.muted} style={styles.feeInput} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => setRefusing(false)} style={[styles.action, { borderColor: colors.border, flex: 1, alignItems: 'center' }]}>
              <Text style={{ color: colors.muted, fontWeight: '700' }}>Жокко чыгаруу</Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={async () => {
                await apply({ status: 'cancelled', cancelReason: reason.trim() });
                setRefusing(false);
              }}
              style={[styles.action, { borderColor: colors.danger, backgroundColor: colors.danger, flex: 1, alignItems: 'center' }]}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>✖ Отказ кылды</Text>
            </Pressable>
          </View>
        </View>
      )}
      {!blacklisted && phoneDigits.length >= 9 && (
        <Pressable onPress={onBlacklist} hitSlop={6}>
          <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 13 }}>⚫ Номерди кара тизмеге кошуу</Text>
        </Pressable>
      )}
      {err && <Text style={{ color: colors.danger }}>{err}</Text>}
    </View>
  );
}

// Бардык заказдар: абалын белгилөө (алып кетти / отказ кылды), жол акысын жазуу. Ар бир өзгөрүүдө кардарга билдирме кетет.
export default function AdminOrders() {
  const [list, setList] = useState<ServerOrder[]>([]);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('new');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [black, setBlack] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    fetchBlacklist()
      .then((b) => setBlack(new Set(b.map((x) => x.phone))))
      .catch(() => {});
    try {
      setList(await fetchOrders());
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setError(m.includes('orders') ? 'SQL иштетиле элек (014 жана 015).' : m);
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const shown = filter === 'all' ? list : list.filter((o) => o.status === filter);
  const count = (s: OrderStatus) => list.filter((o) => o.status === s).length;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {FILTERS.map((f) => (
          <Chip key={f} label={f === 'all' ? `Баары (${list.length})` : `${LABEL[f]} (${count(f)})`} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </ScrollView>
      {error && <Text style={{ color: colors.danger }}>{error}</Text>}
      {!loading && !error && shown.length === 0 && <Text style={styles.empty}>Заказ жок. Ылдый тартып жаңыртыңыз.</Text>}
      {shown.map((o) => (
        <OrderStatusCard key={o.id} order={o}>
          <Controls
            o={o}
            blacklisted={black.has(phone9(o.phone))}
            onBlacklist={() =>
              addToBlacklist(o.phone, o.cancelReason || `Заказ №${o.number}`)
                .then(() => setBlack((b) => new Set(b).add(phone9(o.phone))))
                .catch((e) => setError(e instanceof Error ? e.message : 'Ката кетти'))
            }
            onChange={(n) => setList((l) => l.map((x) => (x.id === n.id ? n : x)))}
          />
        </OrderStatusCard>
      ))}
      <Text style={styles.muted}>
        Бардык заказдар ушул жерде: өзү алгандар жана экспресс. Экспресс жол акысын айтканда ушул жерге жазыңыз. Абал өзгөргөндө кардарга (аккаунту болсо) билдирме барат.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 24 },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feeBox: { gap: 8, backgroundColor: '#FFFBEB', borderRadius: radius.md, padding: 10 },
  feeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feeInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16, color: colors.text, backgroundColor: colors.card },
  small: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 9 },
  refuse: { gap: 8, backgroundColor: '#FEF2F2', borderRadius: radius.md, padding: 10 },
  action: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 7 },
});
