import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../config/theme';
import { useAccount } from '../../context/AccountContext';
import { useContent } from '../../context/ContentContext';
import { useT } from '../../i18n';
import { fetchMyRepairs, Repair } from '../../lib/repairs';
import { RateRepair } from './RateRepair';

// Башкы бетте: бүткөн, бирок бааланбаган выезд / оңдоо болсо — «Мастер кандай иштеди?» карточкасы
export function RateCard() {
  const { t } = useT();
  const { profile } = useAccount();
  const { masters } = useContent();
  const [list, setList] = useState<Repair[]>([]);
  const [thanks, setThanks] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!profile) {
        setList([]);
        return;
      }
      const since = Date.now() - 14 * 86400000;
      fetchMyRepairs(profile.id)
        .then((l) => setList(l.filter((r) => r.status === 'done' && !r.ratedAt && new Date(r.doneAt ?? r.updatedAt ?? r.createdAt).getTime() >= since).slice(0, 2)))
        .catch(() => setList([]));
    }, [profile]),
  );

  if (thanks)
    return (
      <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
        <MaterialCommunityIcons name="heart" size={22} color="#F59E0B" />
        <Text style={{ flex: 1, color: colors.text, fontWeight: '800' }}>{t('rate.thanksLong')}</Text>
      </View>
    );
  if (!list.length) return null;
  return (
    <View style={{ gap: 10 }}>
      {list.map((r) => {
        const m = masters.find((x) => x.id === r.masterId);
        return (
          <View key={r.id} style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name={r.outcall ? 'car-side' : 'wrench'} size={22} color={colors.success} />
              <Text style={styles.h}>
                {r.outcall ? t('my.outcall') : t('my.repair')} №{r.number} · {t('my.st.done')}
              </Text>
            </View>
            <RateRepair
              r={r}
              masterName={m?.name}
              onDone={() => {
                setList((l) => l.filter((x) => x.id !== r.id));
                setThanks(r.id);
                setTimeout(() => setThanks(null), 4000);
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, gap: 10, borderWidth: 2, borderColor: '#F59E0B' },
  h: { flex: 1, fontSize: 15, fontWeight: '900', color: colors.text },
});
