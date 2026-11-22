import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LoginForm } from '../../components/account/LoginForm';
import { RentOnboarding, RentSteps } from '../../components/account/RentOnboarding';
import { FadeIn } from '../../components/anim';
import { BIKE_IMAGE, BIKE_RATIO } from '../../components/BikeRide';
import { RentHeader } from '../../components/RentHeader';
import { Button } from '../../components/ui';
import { SHOP } from '../../config/shop';
import { colors, radius } from '../../config/theme';
import { docsReady, useAccount } from '../../context/AccountContext';
import { useContent } from '../../context/ContentContext';
import { periodsOf, priceFor, RentalBike } from '../../data/rentals';
import { useT } from '../../i18n';
import { formatPrice, openWhatsApp } from '../../lib/format';

function ModelCard({ bike, index }: { bike: RentalBike; index: number }) {
  const { t } = useT();
  const periods = periodsOf(bike);
  // Картада: жумалык баа, жок болсо — айлык
  const shown = periods.includes('week') ? 'week' : periods[0];
  const shownPrice = shown ? priceFor(bike, shown) : undefined;
  return (
    <FadeIn delay={index * 70}>
      <Pressable
        style={({ pressed }) => [styles.model, !bike.available && { opacity: 0.6 }, pressed && { transform: [{ scale: 0.98 }] }]}
        onPress={() => router.push({ pathname: '/rental/[id]', params: { id: bike.id } })}
        accessibilityRole="button"
        accessibilityLabel={bike.name}
      >
        <View style={styles.photo}>
          {bike.imageUrl ? (
            <Image source={{ uri: bike.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <Image source={BIKE_IMAGE} style={{ width: '88%', aspectRatio: BIKE_RATIO }} resizeMode="contain" />
          )}
        </View>
        <View style={styles.modelBody}>
          <Text style={styles.brand}>{(bike.available ? t('rent.available') : t('rent.busy')).toUpperCase()}</Text>
          <Text style={styles.modelName} numberOfLines={2}>
            {bike.name}
          </Text>
          {!!shownPrice && (
            <Text style={styles.from}>{t(shown === 'week' ? 'rent.perWeekShort' : 'rent.perMonthShort', { sum: formatPrice(shownPrice) })}</Text>
          )}
          <View style={styles.modelFoot}>
            <View style={styles.kind}>
              <Text style={styles.kindText}>{t('rent.kind')}</Text>
            </View>
            <View style={styles.arrow}>
              <MaterialCommunityIcons name="arrow-right" size={20} color={colors.primary} />
            </View>
          </View>
        </View>
      </Pressable>
    </FadeIn>
  );
}

// Ижара — дүкөндөн өзүнчө бөлүм: 1) кирүү 2) паспорт жана туугандар 3) моделдер → тарифтер → тариздөө
export default function Rent() {
  const { ready, profile } = useAccount();
  const { t } = useT();
  let body;
  if (!ready) body = <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />;
  else if (!profile)
    body = (
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16 }}>
          <RentSteps step={1} />
        </View>
        <LoginForm onDone={() => {}} subtitle={t('rent.loginSub')} />
      </View>
    );
  else if (!docsReady(profile)) body = <RentOnboarding />;
  else body = <RentModels />;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <RentHeader />
      {body}
    </View>
  );
}

function RentModels() {
  const { t } = useT();
  const { rentals } = useContent();
  const params = useLocalSearchParams<{ bike?: string }>();

  // Башкы беттен велосипед тандалып келсе — дароо тарифтерине өтөбүз
  useEffect(() => {
    if (params.bike && rentals.some((b) => b.id === params.bike)) {
      router.push({ pathname: '/rental/[id]', params: { id: params.bike } });
      router.setParams({ bike: undefined });
    }
  }, [params.bike, rentals]);

  const list = [...rentals].sort((a, b) => Number(b.available) - Number(a.available));

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
        <View style={styles.head}>
          <View style={styles.headIcon}>
            <MaterialCommunityIcons name="bicycle-electric" size={30} color={colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.headTitle}>{t('rent.models')}</Text>
            <Text style={styles.headSub}>{t('rent.modelsSub')}</Text>
          </View>
        </View>

        {list.length === 0 && (
          <View style={[styles.head, { flexDirection: 'column', alignItems: 'stretch', gap: 12 }]}>
            <Text style={{ color: colors.muted, textAlign: 'center' }}>{t('rent.empty')}</Text>
            <Button title={t('rent.ask')} icon="whatsapp" variant="whatsapp" onPress={() => openWhatsApp(t('msg.rent'), SHOP.rentWhatsapp).catch(() => {})} />
          </View>
        )}
        {list.map((b, i) => (
          <ModelCard key={b.id} bike={b} index={i} />
        ))}

        <Pressable style={styles.terms} onPress={() => router.push({ pathname: '/account/info', params: { type: 'terms' } })}>
          <MaterialCommunityIcons name="file-document-outline" size={20} color={colors.primary} />
          <Text style={{ flex: 1, color: colors.text, fontWeight: '700' }}>{t('rent.terms')}</Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
        </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderRadius: 26, padding: 16, borderWidth: 1, borderColor: colors.border },
  headIcon: { width: 60, height: 60, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  headTitle: { fontSize: 22, fontWeight: '900', color: colors.text },
  headSub: { fontSize: 14, color: colors.muted },
  model: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 26, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, minHeight: 150 },
  photo: { width: '44%', backgroundColor: '#F8FAF8', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  modelBody: { flex: 1, padding: 16, gap: 4 },
  brand: { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 1.2 },
  modelName: { fontSize: 19, fontWeight: '900', color: colors.text },
  from: { fontSize: 14, fontWeight: '800', color: colors.primary },
  modelFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 8 },
  kind: { backgroundColor: colors.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  kindText: { fontSize: 12, fontWeight: '700', color: colors.muted },
  arrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  terms: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border },
});
