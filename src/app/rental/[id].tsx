import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FadeIn } from '../../components/anim';
import { BIKE_IMAGE, BIKE_RATIO } from '../../components/BikeRide';
import { Button } from '../../components/ui';
import { colors } from '../../config/theme';
import { useAccount } from '../../context/AccountContext';
import { useContent } from '../../context/ContentContext';
import { periodsOf, priceFor, RentPeriod } from '../../data/rentals';
import { TKey, useT } from '../../i18n';
import { formatPrice } from '../../lib/format';

const DAYS: Record<RentPeriod, number> = { day: 1, week: 7, month: 30 };
const TITLE: Record<RentPeriod, TKey> = { day: 'rent.tariff.day', week: 'rent.tariff.week', month: 'rent.tariff.month' };
const TEXT: Record<RentPeriod, TKey> = { day: 'rent.tariffText.day', week: 'rent.tariffText.week', month: 'rent.tariffText.month' };

// Бир велосипеддин тарифтери (скриншоттогудай карталар)
export default function Tariffs() {
  const { t } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { rentals } = useContent();
  const { profile } = useAccount();
  const bike = rentals.find((b) => b.id === id);

  if (!bike) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Stack.Screen options={{ title: t('rent.tariffs') }} />
        <Text style={{ color: colors.muted }}>{t('rent.empty')}</Text>
      </View>
    );
  }

  const periods = periodsOf(bike);
  const popular: RentPeriod | undefined = periods.includes('week') ? 'week' : periods[0];

  const order = (p: RentPeriod) => {
    const target = `/rental/checkout?bike=${encodeURIComponent(bike.id)}&period=${p}`;
    if (profile) router.push({ pathname: '/rental/checkout', params: { bike: bike.id, period: p } });
    else router.push({ pathname: '/account/login', params: { next: target } });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: bike.name }} />

      <View style={styles.hero}>
        {bike.imageUrl ? (
          <Image source={{ uri: bike.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={bike.name} />
        ) : (
          <Image source={BIKE_IMAGE} style={{ width: '62%', aspectRatio: BIKE_RATIO }} resizeMode="contain" />
        )}
      </View>

      {(!!bike.description || bike.specs.length > 0) && (
        <View style={styles.card}>
          {!!bike.description && <Text style={styles.desc}>{bike.description}</Text>}
          {bike.specs.map(([k, v]) => (
            <View key={k} style={styles.spec}>
              <Text style={styles.muted}>{k}</Text>
              <Text style={styles.specValue}>{v}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.head}>
        <View style={styles.headIcon}>
          <MaterialCommunityIcons name="cash-multiple" size={28} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headTitle}>{t('rent.tariffs')}</Text>
          <Text style={styles.muted}>{t('rent.tariffsSub')}</Text>
        </View>
      </View>

      {periods.map((p, i) => {
        const price = priceFor(bike, p)!;
        return (
          <FadeIn key={p} delay={i * 80}>
            <View style={styles.tariff}>
              <View style={styles.tariffHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tariffTitle}>{t(TITLE[p])}</Text>
                  <Text style={styles.muted}>{t('rent.days', { n: DAYS[p] })}</Text>
                </View>
                {p === popular && periods.length > 1 && (
                  <View style={styles.popular}>
                    <MaterialCommunityIcons name="star" size={14} color={colors.accent} />
                    <Text style={styles.popularText}>{t('rent.popular').toUpperCase()}</Text>
                  </View>
                )}
              </View>
              <View style={styles.tariffBody}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.price}>{formatPrice(price)}</Text>
                  </View>
                  <View style={styles.daysChip}>
                    <MaterialCommunityIcons name="calendar-blank-outline" size={16} color={colors.muted} />
                    <Text style={styles.daysText}>{t('rent.days', { n: DAYS[p] })}</Text>
                  </View>
                </View>
                <Text style={styles.desc}>{t(TEXT[p])}</Text>
                {!!bike.deposit && <Text style={styles.muted}>{t('rent.deposit', { sum: formatPrice(bike.deposit) })}</Text>}
                <Button
                  title={bike.available ? t('rent.order') : t('rent.busy')}
                  disabled={!bike.available}
                  onPress={() => order(p)}
                  style={{ borderRadius: 999 }}
                />
              </View>
            </View>
          </FadeIn>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { height: 210, borderRadius: 26, backgroundColor: '#F8FAF8', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  card: { backgroundColor: colors.card, borderRadius: 24, padding: 16, gap: 8, borderWidth: 1, borderColor: colors.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderRadius: 26, padding: 16, borderWidth: 1, borderColor: colors.border },
  headIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  headTitle: { fontSize: 22, fontWeight: '900', color: colors.text },
  tariff: { backgroundColor: colors.card, borderRadius: 26, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  tariffHead: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F3', padding: 18, gap: 8 },
  tariffTitle: { fontSize: 19, fontWeight: '900', color: colors.text },
  popular: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  popularText: { fontSize: 11, fontWeight: '900', color: '#92400E', letterSpacing: 0.6 },
  tariffBody: { padding: 18, gap: 12 },
  price: { fontSize: 32, fontWeight: '900', color: colors.primary },
  daysChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  daysText: { color: colors.muted, fontWeight: '700' },
  desc: { fontSize: 15, lineHeight: 22, color: colors.text },
  spec: { flexDirection: 'row', justifyContent: 'space-between' },
  specValue: { color: colors.text, fontWeight: '700' },
  muted: { color: colors.muted, fontSize: 14 },
});
