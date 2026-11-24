import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../config/theme';
import { useAccount } from '../../context/AccountContext';
import { RENT_MIN_DAYS } from '../../data/rentals';
import { useT } from '../../i18n';
import { formatPrice } from '../../lib/format';
import { fetchMyRentRequests, RentRequest } from '../../lib/rentRequests';
import { fmtSom, myBalance } from '../../lib/wallet';

const daysSince = (iso: string) => {
  const a = new Date(new Date(iso).toDateString()).getTime();
  const b = new Date(new Date().toDateString()).getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
};

// «Менин ижарам»: кирген кардарга — канча күн болду, балансында канча акча бар, дагы канча күнгө жетет.
// Ижарасы жок болсо эч нерсе көрсөтпөйт.
export function MyRentalCard() {
  const { t } = useT();
  const { profile } = useAccount();
  const [rents, setRents] = useState<RentRequest[]>([]);
  const [balance, setBalance] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!profile) {
        setRents([]);
        return;
      }
      // Адегенде ижаралар (күнүмдүк эсептөө ошол учурда жүрөт), андан кийин гана баланс
      fetchMyRentRequests(profile.id)
        .then((l) => setRents(l.filter((r) => r.status === 'active' || (r.status === 'new' && r.billing))))
        .catch(() => setRents([]))
        .then(() => myBalance())
        .then(setBalance)
        .catch(() => setBalance(null));
    }, [profile]),
  );

  if (!profile || rents.length === 0) return null;
  return (
    <View style={{ gap: 10 }}>
      {rents.map((r) => {
        const daily = r.dailyPrice ?? 0;
        const days = r.startedAt ? daysSince(r.startedAt) + 1 : 0; // алган күн 1-күн
        const charged = (r.chargedDays ?? 0) * daily;
        const left = daily > 0 && balance !== null ? Math.floor(balance / daily) : null;
        const low = r.status === 'active' && balance !== null && daily > 0 && balance <= daily;
        const minLeft = Math.max(0, RENT_MIN_DAYS - days);
        return (
          <Pressable key={r.id} style={[styles.card, low && styles.low]} onPress={() => router.push('/account/rentals')} accessibilityRole="button">
            <View style={styles.row}>
              <MaterialCommunityIcons name="bicycle-electric" size={26} color={low ? colors.danger : colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{t('mr.title')}</Text>
                <Text style={styles.bike} numberOfLines={1}>
                  {r.bikeName}
                  {r.contractNo ? ` · №${r.contractNo}` : ''}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
            </View>

            {r.status === 'new' ? (
              <Text style={styles.wait}>⏳ {t('rd.waiting')}</Text>
            ) : (
              <>
                <View style={styles.stats}>
                  <View style={styles.stat}>
                    <Text style={styles.statN}>{days}</Text>
                    <Text style={styles.statL}>{t('mr.days')}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={[styles.statN, { color: low ? colors.danger : colors.success }]}>{balance === null ? '…' : fmtSom(balance)}</Text>
                    <Text style={styles.statL}>{t('w.balance')}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={[styles.statN, { color: low ? colors.danger : colors.text }]}>{left === null ? '…' : Math.max(0, left)}</Text>
                    <Text style={styles.statL}>{t('mr.daysLeft')}</Text>
                  </View>
                </View>
                <Text style={styles.muted}>
                  {t('rd.perDay', { v: formatPrice(daily) })} · {t('mr.charged', { v: fmtSom(charged) })}
                  {r.startedAt ? ` · ${t('rd.started', { v: new Date(r.startedAt).toLocaleDateString('ru-RU') })}` : ''}
                </Text>
                {minLeft > 0 && <Text style={styles.muted}>{t('mr.minLeft', { n: minLeft })}</Text>}
                {low && <Text style={styles.warn}>⚠️ {t('rd.lowNow')}</Text>}
              </>
            )}

            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Pressable onPress={() => router.push('/wallet')} style={[styles.btn, low && { backgroundColor: colors.danger, borderColor: colors.danger }]}>
                <MaterialCommunityIcons name="wallet-plus" size={18} color={low ? '#fff' : colors.primary} />
                <Text style={{ color: low ? '#fff' : colors.primary, fontWeight: '800' }}>{t('w.go')}</Text>
              </Pressable>
              {!!r.contractNo && (
                <Pressable onPress={() => router.push({ pathname: '/rental/contract/[id]', params: { id: r.id } })} style={styles.btn}>
                  <MaterialCommunityIcons name="file-document-outline" size={18} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: '800' }}>{t('mr.contract')}</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, gap: 10, borderWidth: 2, borderColor: colors.primary },
  low: { borderColor: colors.danger, backgroundColor: '#FEF2F2' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 12, fontWeight: '800', color: colors.muted, textTransform: 'uppercase' },
  bike: { fontSize: 16, fontWeight: '900', color: colors.text },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', backgroundColor: colors.bg, borderRadius: radius.md, paddingVertical: 10 },
  statN: { fontSize: 18, fontWeight: '900', color: colors.text },
  statL: { fontSize: 11, color: colors.muted, textAlign: 'center' },
  muted: { fontSize: 12, color: colors.muted },
  warn: { fontSize: 14, fontWeight: '800', color: colors.danger },
  wait: { fontSize: 14, fontWeight: '700', color: '#2563EB' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
});
