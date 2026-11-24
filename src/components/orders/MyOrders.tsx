import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../config/theme';
import { useAccount } from '../../context/AccountContext';
import { useCart } from '../../context/CartContext';
import { useContent } from '../../context/ContentContext';
import { TKey, useT } from '../../i18n';
import { formatPrice } from '../../lib/format';
import { fetchOrders, ServerOrder } from '../../lib/orders';
import { cancelMyRepair, fetchMyRepairs, fmtVisit, Repair, RepairStatus } from '../../lib/repairs';
import { fetchMyRentRequests, RentRequest } from '../../lib/rentRequests';
import { OrderStatusCard } from '../OrderStatusCard';
import { PhotoStrip } from '../repair/PhotoStrip';
import { SectionTitle } from '../ui';

const STEPS: RepairStatus[] = ['new', 'accepted', 'in_progress', 'done'];
const COLOR: Record<RepairStatus, string> = { new: '#2563EB', accepted: '#0D9488', in_progress: '#D97706', done: colors.success, cancelled: colors.danger };

// Оңдоо / выезд заказы: кайсы мастер, качан келет, абалы
function RepairOrder({ r, onChange }: { r: Repair; onChange: () => void }) {
  const { t } = useT();
  const { masters } = useContent();
  const m = masters.find((x) => x.id === r.masterId);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const cancelled = r.status === 'cancelled';
  const stepIdx = STEPS.indexOf(r.status);
  const canCancel = (r.status === 'new' || r.status === 'accepted') && !r.arrivedAt;
  const cancel = async () => {
    setBusy(true);
    await cancelMyRepair(r.id).catch(() => false);
    setBusy(false);
    setConfirm(false);
    onChange();
  };
  return (
    <View style={[styles.card, { borderLeftColor: COLOR[r.status] }]}>
      <View style={styles.row}>
        <MaterialCommunityIcons name={r.outcall ? 'car-side' : 'wrench'} size={20} color={COLOR[r.status]} />
        <Text style={styles.h}>{r.outcall ? t('my.outcall') : t('my.repair')} №{r.number}</Text>
        <Text style={[styles.badge, { backgroundColor: COLOR[r.status] }]}>{t(`my.st.${r.status}` as TKey)}</Text>
      </View>

      {!cancelled && (
        <View style={styles.steps}>
          {STEPS.map((s, i) => (
            <View key={s} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View style={[styles.dot, { backgroundColor: i <= stepIdx ? COLOR[r.status] : colors.border }]} />
              <Text style={[styles.stepTxt, i <= stepIdx && { color: colors.text, fontWeight: '700' }]} numberOfLines={2}>
                {t(`my.st.${s}` as TKey)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Мастер */}
      <View style={styles.master}>
        <View style={styles.photo}>
          {m?.photoUrl ? <Image source={{ uri: m.photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <MaterialCommunityIcons name="account-hard-hat" size={28} color={colors.primary} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{t('my.master')}</Text>
          {m ? (
            <>
              <Text style={{ fontWeight: '800', color: colors.text, fontSize: 15 }}>{m.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{[m.specialty, `⭐ ${m.rating.toFixed(1)}`].filter(Boolean).join(' · ')}</Text>
            </>
          ) : (
            <Text style={{ color: colors.muted, fontWeight: '600' }}>{t('my.noMaster')}</Text>
          )}
        </View>
      </View>

      {!!r.etaAt && !cancelled && r.status !== 'done' && (
        <View style={styles.when}>
          <MaterialCommunityIcons name="clock-check-outline" size={22} color={colors.primary} />
          <Text style={{ color: colors.text, fontWeight: '900', flex: 1, fontSize: 15 }}>{r.outcall ? t('my.etaOutcall', { v: fmtVisit(r.etaAt) }) : t('my.etaShop', { v: fmtVisit(r.etaAt) })}</Text>
        </View>
      )}
      {!!r.visitAt && !cancelled && !r.etaAt && (
        <View style={[styles.when, { backgroundColor: colors.bg }]}>
          <MaterialCommunityIcons name="clock-outline" size={20} color={colors.muted} />
          <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{t('my.wish', { v: fmtVisit(r.visitAt) })}</Text>
        </View>
      )}
      {!!r.arrivedAt && <Text style={[styles.text, { color: '#2563EB', fontWeight: '800' }]}>📍 {t('mp.arrivedAt', { v: fmtVisit(r.arrivedAt) })}</Text>}
      {r.outcall && !!r.address && <Text style={styles.text}>🏠 {r.address}</Text>}
      {!r.outcall && !!r.branch && <Text style={styles.text}>🏪 {r.branch}</Text>}
      {r.services.length > 0 && <Text style={styles.text}>🔧 {r.services.join(', ')}</Text>}
      {!!r.problem && <Text style={styles.text}>💬 {r.problem}</Text>}
      <PhotoStrip photos={r.photos} size={60} />
      {!!r.masterNote && (
        <View style={styles.note}>
          <Text style={styles.label}>{t('my.masterNote')}</Text>
          <Text style={{ color: colors.text, fontWeight: '600' }}>{r.masterNote}</Text>
        </View>
      )}
      {!!r.outcallFee && (
        <Text style={{ color: '#92400E', fontSize: 13 }}>
          💰 {t('my.fee', { v: String(r.outcallFee) })}
          {cancelled && !r.arrivedAt ? ` · ${t('my.refunded')}` : ''}
        </Text>
      )}
      {canCancel &&
        (confirm ? (
          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.text }}>{t('my.cancelAsk')}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => setConfirm(false)} style={[styles.btn, { borderColor: colors.muted }]}>
                <Text style={{ color: colors.muted, fontWeight: '800' }}>{t('my.no')}</Text>
              </Pressable>
              <Pressable onPress={cancel} disabled={busy} style={[styles.btn, { borderColor: colors.danger, backgroundColor: colors.danger, flex: 1 }]}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>{t('my.yesCancel')}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setConfirm(true)} style={[styles.btn, { borderColor: colors.danger, alignSelf: 'flex-start' }]}>
            <Text style={{ color: colors.danger, fontWeight: '800' }}>{t('my.cancel')}</Text>
          </Pressable>
        ))}
    </View>
  );
}

function RentOrder({ r }: { r: RentRequest }) {
  const { t } = useT();
  return (
    <Pressable style={[styles.card, { borderLeftColor: colors.primary }]} onPress={() => router.push('/account/rentals')}>
      <View style={styles.row}>
        <MaterialCommunityIcons name="bicycle-electric" size={20} color={colors.primary} />
        <Text style={styles.h}>{r.bikeName}</Text>
        <Text style={[styles.badge, { backgroundColor: r.status === 'active' ? colors.success : r.status === 'new' ? '#2563EB' : colors.muted }]}>{t(`acc.status.${r.status}` as TKey)}</Text>
      </View>
      {!!r.total && <Text style={styles.text}>{formatPrice(r.total)}</Text>}
      {!!r.paidUntil && <Text style={styles.text}>💳 {t('my.paidUntil', { v: r.paidUntil.split('-').reverse().join('.') })}</Text>}
    </Pressable>
  );
}

// «Себет»: кардар заказ кылгандын баары — оңдоо/выезд, товар, ижара
export function MyOrders() {
  const { t } = useT();
  const { profile } = useAccount();
  const { orders: localOrders } = useCart();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [orders, setOrders] = useState<ServerOrder[]>([]);
  const [rents, setRents] = useState<RentRequest[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    const [a, b, c] = await Promise.all([
      fetchMyRepairs(profile.id).catch(() => []),
      fetchOrders(profile.id).catch(() => []),
      fetchMyRentRequests(profile.id).catch(() => []),
    ]);
    setRepairs(a);
    setOrders(b);
    setRents(c.filter((r) => r.status === 'new' || r.status === 'active'));
  }, [profile]);
  useFocusEffect(
    useCallback(() => {
      load();
      const id = setInterval(load, 30000);
      return () => clearInterval(id);
    }, [load]),
  );

  if (!profile) {
    return (
      <View style={styles.guest}>
        <Text style={{ color: colors.muted, textAlign: 'center' }}>{t('my.guest')}</Text>
        <Pressable onPress={() => router.push({ pathname: '/account/login', params: { next: '/cart' } })}>
          <Text style={{ color: colors.primary, fontWeight: '800' }}>{t('acc.signIn')}</Text>
        </Pressable>
        {localOrders.length > 0 && (
          <Pressable onPress={() => router.push('/orders')}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('cart.myOrders', { n: localOrders.length })}</Text>
          </Pressable>
        )}
      </View>
    );
  }

  const activeRepairs = repairs.filter((r) => r.status !== 'done' && r.status !== 'cancelled');
  const pastRepairs = repairs.filter((r) => r.status === 'done' || r.status === 'cancelled').slice(0, 5);
  const nothing = !repairs.length && !orders.length && !rents.length;
  return (
    <View style={{ gap: 12 }}>
      <SectionTitle>{t('my.title')}</SectionTitle>
      {nothing && <Text style={{ color: colors.muted }}>{t('my.empty')}</Text>}
      {activeRepairs.map((r) => (
        <RepairOrder key={r.id} r={r} onChange={load} />
      ))}
      {orders.slice(0, 10).map((o) => (
        <OrderStatusCard key={o.id} order={o} />
      ))}
      {rents.map((r) => (
        <RentOrder key={r.id} r={r} />
      ))}
      {pastRepairs.length > 0 && <Text style={[styles.label, { marginTop: 4 }]}>{t('my.past')}</Text>}
      {pastRepairs.map((r) => (
        <RepairOrder key={r.id} r={r} onChange={load} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, gap: 8, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  h: { fontSize: 16, fontWeight: '900', color: colors.text, flexShrink: 1 },
  badge: { marginLeft: 'auto', color: '#fff', fontWeight: '800', fontSize: 12, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, overflow: 'hidden' },
  steps: { flexDirection: 'row', gap: 4, marginVertical: 2 },
  dot: { width: '100%', height: 6, borderRadius: 3 },
  stepTxt: { fontSize: 11, color: colors.muted, textAlign: 'center' },
  master: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg, borderRadius: radius.md, padding: 10 },
  photo: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  label: { fontSize: 12, fontWeight: '800', color: colors.muted, textTransform: 'uppercase' },
  when: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECFDF5', borderRadius: radius.md, padding: 10 },
  text: { color: colors.text, fontSize: 14 },
  note: { gap: 2, backgroundColor: '#FEF3C7', borderRadius: radius.md, padding: 10 },
  btn: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 9, alignItems: 'center' },
  guest: { alignItems: 'center', gap: 8, padding: 12, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
});
