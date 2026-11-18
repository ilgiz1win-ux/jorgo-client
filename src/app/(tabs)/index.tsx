import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeroBanner, ReviewsCarousel, StatsRow } from '../../components/HomeSections';
import { InstallBanner } from '../../components/InstallApp';
import { ProductGrid } from '../../components/ProductGrid';
import { PromoCarousel } from '../../components/PromoCarousel';
import { SkeletonGrid } from '../../components/Skeleton';
import { SectionTitle } from '../../components/ui';
import { colors, radius } from '../../config/theme';
import { useCatalog } from '../../context/CatalogContext';
import { useContent } from '../../context/ContentContext';
import { CATEGORIES } from '../../data/products';

const LOGO = require('../../../assets/brand/logo.png');

export default function Home() {
  const insets = useSafeAreaInsets();
  const { products, promos, loading, refresh } = useCatalog();
  const { settings, reviews, refreshContent } = useContent();
  const popular = products.filter((p) => p.popular);
  const onSale = products.filter((p) => p.oldPrice && p.oldPrice > p.price);
  const activePromos = promos.filter((p) => p.active);
  const showSkeleton = loading && products.length === 0;

  const all = (
    <Link href="/catalog" style={styles.link}>
      Баары →
    </Link>
  );

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 96 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => {
            refresh();
            refreshContent();
          }} />}
    >
      {/* Логотип жана издөө */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="Jorgo Eco Service" />
        <Pressable style={styles.search} onPress={() => router.push('/catalog')} accessibilityRole="search">
          <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} />
          <Text style={{ color: colors.muted, fontSize: 15 }}>Товар издөө…</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <InstallBanner />
        <HeroBanner settings={settings} />
        <StatsRow stats={settings.stats} />
        <PromoCarousel promos={activePromos} />

        <SectionTitle>Категориялар</SectionTitle>
        <View style={styles.cats}>
          {CATEGORIES.map((c) => (
            <Pressable key={c.id} style={styles.cat} onPress={() => router.push({ pathname: '/catalog', params: { category: c.id } })}>
              <View style={[styles.catIcon, { backgroundColor: c.color + '1A' }]}>
                <MaterialCommunityIcons name={c.icon} size={28} color={c.color} />
              </View>
              <Text style={styles.catText} numberOfLines={2}>
                {c.title}
              </Text>
            </Pressable>
          ))}
        </View>

        {onSale.length > 0 && (
          <>
            <SectionTitle right={all}>🔥 Акциядагы товарлар</SectionTitle>
            <ProductGrid products={onSale.slice(0, 6)} />
          </>
        )}

        <Link href="/repair" asChild>
          <Pressable style={styles.repair}>
            <View style={styles.repairIcon}>
              <MaterialCommunityIcons name="tools" size={28} color={colors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.repairTitle}>Электровелосипед оңдоо</Text>
              <Text style={styles.repairText}>Диагностика, батарея, мотор — тез жана кепилдик менен</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={26} color={colors.lime} />
          </Pressable>
        </Link>

        <SectionTitle right={all}>Популярдуу товарлар</SectionTitle>
        {showSkeleton ? <SkeletonGrid count={4} /> : <ProductGrid products={popular} />}

        {reviews.length > 0 && (
          <>
            <SectionTitle>Кардарлардын пикирлери</SectionTitle>
            <ReviewsCarousel reviews={reviews} />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.card, paddingHorizontal: 16, paddingBottom: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  logo: { width: 150, height: 84, alignSelf: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border },
  body: { padding: 16, gap: 14 },
  link: { color: colors.primary, fontWeight: '700' },
  repair: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.ink, borderRadius: radius.lg, padding: 16 },
  repairIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  repairTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  repairText: { color: '#D1D5DB', fontSize: 13, marginTop: 2 },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cat: { flexBasis: '30%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: 10, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border },
  catIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  catText: { fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'center' },
});
