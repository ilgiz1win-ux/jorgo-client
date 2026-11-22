import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReviewsCarousel, StatsRow } from '../../components/HomeSections';
import { InstallBanner } from '../../components/InstallApp';
import { ProductGrid } from '../../components/ProductGrid';
import { PromoCarousel } from '../../components/PromoCarousel';
import { SkeletonGrid } from '../../components/Skeleton';
import { SectionTitle } from '../../components/ui';
import { MastersList } from '../../components/MastersList';
import { RentBikeGrid } from '../../components/RentBikeGrid';
import { useUnread } from '../../lib/useUnread';
import { colors, radius } from '../../config/theme';
import { useCatalog } from '../../context/CatalogContext';
import { useContent } from '../../context/ContentContext';
import { CATEGORIES } from '../../data/products';
import { useT } from '../../i18n';
import { LangSwitch } from '../../components/LangSwitch';

const LOGO = require('../../../assets/brand/logo.png');

export default function Home() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const { products, promos, loading, refresh } = useCatalog();
  const { settings, reviews, masters, rentals, refreshContent } = useContent();
  // Дүкөндүн коңгуроосу: жалпы жаңылыктар гана
  const unread = useUnread(true, true, false);
  const popular = products.filter((p) => p.popular);
  const onSale = products.filter((p) => p.oldPrice && p.oldPrice > p.price);
  const activePromos = promos.filter((p) => p.active);
  const showSkeleton = loading && products.length === 0;

  const all = (
    <Link href="/catalog" style={styles.link}>
      {t('common.allArrow')}
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
        {/* Логотип ортодо + ураан; солдо 🔔 🔍, оңдо тил */}
        <View style={styles.headerRow}>
          <View style={styles.side}>
            <Pressable style={styles.iconBtn} onPress={() => router.push('/news')} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('news.title')}>
              <MaterialCommunityIcons name="bell-outline" size={23} color={colors.text} />
              {unread > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unread > 9 ? '9+' : unread}</Text>
                </View>
              )}
            </Pressable>
            <Pressable
              style={styles.iconBtn}
              onPress={() => router.push({ pathname: '/catalog', params: { search: '1' } })}
              hitSlop={6}
              accessibilityRole="search"
              accessibilityLabel={t('common.search')}
            >
              <MaterialCommunityIcons name="magnify" size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.brand}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="Jorgo Eco Service" />
            <Text style={styles.slogan} numberOfLines={2}>
              {t('home.slogan')}
            </Text>
          </View>
          <View style={[styles.side, { justifyContent: 'flex-end', zIndex: 20 }]}>
            <LangSwitch />
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <InstallBanner />
        <StatsRow stats={settings.stats} />

        <PromoCarousel promos={activePromos} />

        <SectionTitle>{t('home.categories')}</SectionTitle>
        <View style={styles.cats}>
          {CATEGORIES.map((c) => (
            <Pressable key={c.id} style={styles.cat} onPress={() => router.push({ pathname: '/catalog', params: { category: c.id } })}>
              <View style={[styles.catIcon, { backgroundColor: c.color + '1A' }]}>
                <MaterialCommunityIcons name={c.icon} size={28} color={c.color} />
              </View>
              <Text style={styles.catText} numberOfLines={2}>
                {t(`cat.${c.id}`)}
              </Text>
            </Pressable>
          ))}
          {/* Ижара — категориялардын бири */}
          <Pressable style={[styles.cat, styles.catRent]} onPress={() => router.push('/rent')} accessibilityRole="button">
            <View style={[styles.catIcon, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <MaterialCommunityIcons name="bicycle-electric" size={28} color="#fff" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.rentTitle}>{t('tab.rent')}</Text>
              <Text style={styles.rentSub} numberOfLines={2}>
                {t('rent.homeText')}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={26} color="#fff" />
          </Pressable>
        </View>

        {rentals.length > 0 && (
          <>
            <SectionTitle
              right={
                <Link href="/rent" style={styles.link}>
                  {t('common.allArrow')}
                </Link>
              }
            >
              {t('rent.homeBikes')}
            </SectionTitle>
            <RentBikeGrid bikes={[...rentals].sort((a, b) => Number(b.available) - Number(a.available)).slice(0, 4)} />
          </>
        )}

        {onSale.length > 0 && (
          <>
            <SectionTitle right={all}>{t('home.onSale')}</SectionTitle>
            <ProductGrid products={onSale.slice(0, 6)} />
          </>
        )}

        <Link href="/repair" asChild>
          <Pressable style={styles.repair}>
            <View style={styles.repairIcon}>
              <MaterialCommunityIcons name="tools" size={28} color={colors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.repairTitle}>{t('home.repairTitle')}</Text>
              <Text style={styles.repairText}>{t('home.repairText')}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={26} color={colors.lime} />
          </Pressable>
        </Link>

        {masters.some((m) => m.active) && (
          <>
            <SectionTitle
              right={
                <Link href="/repair" style={styles.link}>
                  {t('common.allArrow')}
                </Link>
              }
            >
              {t('masters.title')}
            </SectionTitle>
            <MastersList masters={masters} />
          </>
        )}


        <SectionTitle right={all}>{t('home.popular')}</SectionTitle>
        {showSkeleton ? <SkeletonGrid count={4} /> : <ProductGrid products={popular} />}

        {reviews.length > 0 && (
          <>
            <SectionTitle>{t('home.reviews')}</SectionTitle>
            <ReviewsCarousel reviews={reviews} />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { zIndex: 10, backgroundColor: colors.card, paddingHorizontal: 16, paddingBottom: 8, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', zIndex: 10 },
  side: { width: 96, flexDirection: 'row', alignItems: 'center', gap: 6 },
  brand: { flex: 1, alignItems: 'center' },
  logo: { width: 120, height: 64 },
  slogan: { fontSize: 12, fontWeight: '700', color: colors.primary, textAlign: 'center', marginTop: 2 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  bellBadge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  bellBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  body: { padding: 16, gap: 14 },
  link: { color: colors.primary, fontWeight: '700' },
  repair: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.ink, borderRadius: radius.lg, padding: 16 },
  rentCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primary, borderRadius: radius.lg, padding: 16 },
  repairIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  repairTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  repairText: { color: '#D1D5DB', fontSize: 13, marginTop: 2 },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cat: { flexBasis: '30%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: 10, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border },
  catRent: { flexBasis: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.primary, borderColor: colors.primary },
  rentTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  rentSub: { color: colors.primarySoft, fontSize: 12 },
  catIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  catText: { fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'center' },
});
