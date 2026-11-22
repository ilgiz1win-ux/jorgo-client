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
import { MastersList } from '../../components/MastersList';
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
  const { settings, reviews, masters, refreshContent } = useContent();
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
        <View style={styles.headerRow}>
          <Pressable style={styles.bellPos} onPress={() => router.push('/news')} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('news.title')}>
            <MaterialCommunityIcons name="bell-outline" size={24} color={colors.text} />
            {unread > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </Pressable>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="Jorgo Eco Service" />
          <View style={styles.langPos}>
            <LangSwitch />
          </View>
        </View>
        <Pressable style={styles.search} onPress={() => router.push('/catalog')} accessibilityRole="search">
          <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} />
          <Text style={{ color: colors.muted, fontSize: 15, flex: 1 }}>{t('common.search')}</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <InstallBanner />
        <HeroBanner settings={settings} />
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
          {/* Ижара — категориялардын бири; велосипеддердин сүрөттөрү ичине киргенде гана */}
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
  header: { backgroundColor: colors.card, paddingHorizontal: 16, paddingBottom: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerRow: { alignItems: 'center', justifyContent: 'center' },
  logo: { width: 150, height: 84 },
  langPos: { position: 'absolute', right: 0, top: 0 },
  bellPos: { position: 'absolute', left: 0, top: 0, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  bellBadge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  bellBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border },
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
