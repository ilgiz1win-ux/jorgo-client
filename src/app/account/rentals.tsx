import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RequireAccount } from '../../components/account/RequireAccount';
import { colors } from '../../config/theme';
import { useAccount } from '../../context/AccountContext';
import type { RentPeriod } from '../../data/rentals';
import { TKey, useT } from '../../i18n';
import { formatPrice } from '../../lib/format';
import { fetchMyRentRequests, RentRequest, RentStatus } from '../../lib/rentRequests';

const STATUS_COLOR: Record<RentStatus, string> = { new: '#2563EB', active: colors.primary, returned: colors.muted, rejected: colors.danger };
const UNIT: Record<RentPeriod, TKey> = { day: 'rent.unit.day', week: 'rent.unit.week', month: 'rent.unit.month' };

function List() {
  const { t } = useT();
  const { profile } = useAccount();
  const [list, setList] = useState<RentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setList(await fetchMyRentRequests(profile!.id));
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
          <Text style={styles.muted}>
            {r.count} {t(UNIT[r.period])}
            {r.total ? ` · ${formatPrice(r.total)}` : ''}
          </Text>
          <Text style={styles.muted}>{new Date(r.createdAt).toLocaleDateString()}</Text>
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
});
