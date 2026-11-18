import { router } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../config/theme';
import { periodsOf, priceFor, RentalBike, RentPeriod } from '../data/rentals';
import { TKey, useT } from '../i18n';
import { formatPrice } from '../lib/format';
import { PressScale } from './anim';
import { BIKE_IMAGE, BIKE_RATIO } from './BikeRide';

const PER: Record<RentPeriod, TKey> = { day: 'rent.perDay', week: 'rent.perWeek', month: 'rent.perMonth' };

// Башкы беттеги ижарага велосипеддер тилкеси (басканда «Аренда» барагы ошол велосипед менен ачылат)
export function RentStrip({ bikes }: { bikes: RentalBike[] }) {
  const { t } = useT();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
      {bikes.map((b) => {
        const first = periodsOf(b)[0];
        return (
          <PressScale
            key={b.id}
            onPress={() => router.push({ pathname: '/rent', params: { bike: b.id } })}
            style={styles.card}
            accessibilityRole="button"
            accessibilityLabel={b.name}
          >
            <View style={styles.photo}>
              {b.imageUrl ? (
                <Image source={{ uri: b.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <Image source={BIKE_IMAGE} style={{ width: '80%', aspectRatio: BIKE_RATIO }} resizeMode="contain" />
              )}
              <View style={[styles.status, { backgroundColor: b.available ? colors.success : colors.muted }]}>
                <Text style={styles.statusText}>{b.available ? t('rent.available') : t('rent.busy')}</Text>
              </View>
            </View>
            <Text style={styles.name} numberOfLines={2}>
              {b.name}
            </Text>
            {first && (
              <Text style={styles.price}>
                {formatPrice(priceFor(b, first)!)} <Text style={styles.per}>{t(PER[first])}</Text>
              </Text>
            )}
          </PressScale>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { width: 220, backgroundColor: colors.card, borderRadius: radius.lg, padding: 10, gap: 6, borderWidth: 1, borderColor: colors.border },
  photo: { height: 120, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  status: { position: 'absolute', top: 8, left: 8, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text, minHeight: 38 },
  price: { fontSize: 16, fontWeight: '900', color: colors.primary },
  per: { fontSize: 12, fontWeight: '600', color: colors.muted },
});
