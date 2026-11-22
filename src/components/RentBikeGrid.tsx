import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../config/theme';
import { periodsOf, priceFor, RentalBike } from '../data/rentals';
import { useT } from '../i18n';
import { formatPrice } from '../lib/format';
import { FadeIn, PressScale } from './anim';
import { BIKE_IMAGE, BIKE_RATIO } from './BikeRide';

// Ижара велосипеди товардын карточкасындай: сүрөт, аты, жумалык (же айлык) баасы
function RentBikeCard({ bike }: { bike: RentalBike }) {
  const { t } = useT();
  const periods = periodsOf(bike);
  const p = periods.includes('week') ? 'week' : periods[0];
  const price = p ? priceFor(bike, p) : undefined;
  return (
    <PressScale
      outerStyle={{ flex: 1 }}
      style={styles.card}
      onPress={() => router.push({ pathname: '/rental/[id]', params: { id: bike.id } })}
      accessibilityLabel={bike.name}
    >
      <View style={styles.image}>
        {bike.imageUrl ? (
          <Image source={{ uri: bike.imageUrl }} style={styles.photo} resizeMode="cover" />
        ) : (
          <Image source={BIKE_IMAGE} style={{ width: '85%', aspectRatio: BIKE_RATIO }} resizeMode="contain" />
        )}
        <View style={[styles.status, { backgroundColor: bike.available ? colors.success : colors.muted }]}>
          <Text style={styles.statusText}>{bike.available ? t('rent.available') : t('rent.busy')}</Text>
        </View>
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {bike.name}
      </Text>
      <View style={styles.bottom}>
        <View style={{ flex: 1 }}>
          {!!price && <Text style={styles.price}>{formatPrice(price)}</Text>}
          {!!p && <Text style={styles.unit}>{p === 'week' ? t('rent.perWeek') : t('rent.perMonth')}</Text>}
        </View>
        <View style={styles.btn}>
          <MaterialCommunityIcons name="key-variant" size={18} color="#fff" />
        </View>
      </View>
    </PressScale>
  );
}

export function RentBikeGrid({ bikes }: { bikes: RentalBike[] }) {
  const rows: RentalBike[][] = [];
  for (let i = 0; i < bikes.length; i += 2) rows.push(bikes.slice(i, i + 2));
  return (
    <View style={{ gap: 12 }}>
      {rows.map((row, r) => (
        <View key={row[0].id} style={{ flexDirection: 'row', gap: 12 }}>
          {row.map((b, c) => (
            <FadeIn key={b.id} delay={(r * 2 + c) * 60} style={{ flex: 1 }}>
              <RentBikeCard bike={b} />
            </FadeIn>
          ))}
          {row.length === 1 && <View style={{ flex: 1 }} />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: 10, gap: 8, borderWidth: 1, borderColor: colors.border },
  image: { height: 110, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  status: { position: 'absolute', top: 8, left: 8, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  name: { fontSize: 14, fontWeight: '600', color: colors.text, minHeight: 36 },
  bottom: { flexDirection: 'row', alignItems: 'flex-end' },
  price: { fontSize: 15, fontWeight: '800', color: colors.primary },
  unit: { fontSize: 11, color: colors.muted },
  btn: { backgroundColor: colors.primary, borderRadius: 10, padding: 8 },
});
