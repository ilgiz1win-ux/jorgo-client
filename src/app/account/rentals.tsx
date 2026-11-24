import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RequireAccount } from '../../components/account/RequireAccount';
import { colors } from '../../config/theme';
import { useAccount } from '../../context/AccountContext';
import type { RentPeriod } from '../../data/rentals';
import { TKey, useT } from '../../i18n';
import { formatPrice } from '../../lib/format';
import { daysLeft, fmtDay } from '../../lib/notifications';
import { fetchMyRentRequests, RentRequest, RentStatus } from '../../lib/rentRequests';
import { fmtSom, myBalance } from '../../lib/wallet';
import { router } from 'expo-router';
import { Button } from '../../components/ui';

const STATUS_COLOR: Record<RentStatus, string> = { new: '#2563EB', active: colors.primary, returned: colors.muted, rejected: colors.danger };
const UNIT: Record<RentPeriod, TKey> = { day: 'rent.unit.day', week: 'rent.unit.week', month: 'rent.unit.month' };

function List() {
  const { t } = useT();
  const { profile } = useAccount();
  const [list, setList] = useState<RentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setList(await fetchMyRentRequests(profile!.id));
      myBalance().then(setBalance).catch(() => setBalance(null));
    } catch {
      setList([]);
    }
    setLoading(false);
  }, [profile]);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      {!loading && list.length === 0 && (
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 60 }}>
          <MaterialCommunityIcons name="bicycle-electric" size={44} color={colors.muted} />
          <Text style={{ color: colors.muted }}>{t('acc.noRents')}</Text>
        </View>
      )}
      {list.map((r) => (
        <View key={r.id} style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.title}>{r.bikeName}</Text>
            <View style={[styles.badge, { backgroundColor: STATUS_COLOR[r.status] }]}>
              <Text style={styles.badgeText}>{t(`acc.status.${r.status}` as TKey)}</Text>
            </View>
          </View>
          {!r.billing && (
            <Text style={styles.muted}>
              {r.count} {t(UNIT[r.period])}
              {r.total ? ` · ${formatPrice(r.total)}` : ''}
            </Text>
          )}
          <Text style={styles.muted}>{new Date(r.createdAt).toLocaleDateString()}</Text>
          {r.billing && r.status === 'new' && <Text style={styles.muted}>⏳ {t('rd.waiting')}</Text>}
          {r.billing && !!r.dailyPrice && <Text style={[styles.muted, { color: colors.text, fontWeight: '700' }]}>{t('rd.perDay', { v: formatPrice(r.dailyPrice) })}</Text>}
          {r.billing && r.status === 'active' && !!r.startedAt && !!r.dailyPrice && (
            <View style={{ gap: 6 }}>
              <Text style={styles.muted}>{t('rd.started', { v: new Date(r.startedAt).toLocaleDateString('ru-RU') })}</Text>
              <Text style={styles.muted}>{t('rd.used', { n: r.chargedDays ?? 0, s: formatPrice((r.chargedDays ?? 0) * r.dailyPrice) })}</Text>
              {balance !== null && (
                <View style={[styles.paid, balance <= r.dailyPrice && { backgroundColor: '#FEE2E2' }]}>
                  <MaterialCommunityIcons name="wallet" size={18} color={balance <= r.dailyPrice ? colors.danger : colors.primary} />
                  <Text style={styles.paidText}>
                    {fmtSom(balance)} · {balance <= r.dailyPrice ? t('rd.lowNow') : t('rd.daysLeft', { n: Math.floor(balance / r.dailyPrice) })}
                  </Text>
                </View>
              )}
              {balance !== null && balance <= r.dailyPrice * 2 && <Button title={t('w.go')} icon="wallet-plus" onPress={() => router.push('/wallet')} style={{ borderRadius: 999 }} />}
            </View>
          )}
          {r.billing && r.status === 'returned' && (
            <Text style={styles.muted}>
              ✅ {t('rd.result', { n: r.chargedDays ?? 0, d: r.damageCharged ? t('rd.damage', { v: formatPrice(r.damageCharged) }) : '' })}
            </Text>
          )}
          {!r.billing && r.status === 'active' && !!r.paidUntil && (
            <View style={[styles.paid, (daysLeft(r.paidUntil) ?? 0) <= 1 && { backgroundColor: '#FEF3C7' }]}>
              <MaterialCommunityIcons name="calendar-check" size={18} color={(daysLeft(r.paidUntil) ?? 0) <= 1 ? '#92400E' : colors.primary} />
              <Text style={styles.paidText}>{t('acc.paidUntil', { d: fmtDay(r.paidUntil) })}</Text>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

export default function MyRentals() {
  return (
    <RequireAccount next="/account/rentals">
      <List />
    </RequireAccount>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 24, padding: 18, gap: 6, borderWidth: 1, borderColor: colors.border },
  title: { flex: 1, fontSize: 17, fontWeight: '800', color: colors.text },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  muted: { color: colors.muted, fontSize: 14 },
  paid: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primarySoft, borderRadius: 14, padding: 10, marginTop: 4 },
  paidText: { color: colors.text, fontWeight: '700', fontSize: 14 },
});
