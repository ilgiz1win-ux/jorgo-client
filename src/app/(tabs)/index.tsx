import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProductGrid } from '../../components/ProductGrid';
import { PromoCarousel } from '../../components/PromoCarousel';
import { SectionTitle } from '../../components/ui';
import { SHOP } from '../../config/shop';
import { colors, radius } from '../../config/theme';
import { useCatalog } from '../../context/CatalogContext';
import { CATEGORIES } from '../../data/products';

export default function Home() {
  const insets = useSafeAreaInsets();
  const { products, promos } = useCatalog();
  const popular = products.filter((p) => p.popular);
  const activePromos = promos.filter((p) => p.active);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.brand}>{SHOP.name}</Text>
        <Text style={styles.tagline}>{SHOP.tagline}</Text>
        <Pressable style={styles.search} onPress={() => router.push('/catalog')}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} />
          <Text style={{ color: colors.muted, fontSize: 15 }}>Товар издөө…</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <PromoCarousel promos={activePromos} />

        <Link href="/repair" asChild>
          <Pressable style={styles.promo}>
            <MaterialCommunityIcons name="tools" size={36} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.promoTitle}>Электровелосипед оңдоо</Text>
              <Text style={styles.promoText}>Диагностика, батарея, мотор — тез жана сапаттуу</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={26} color="#fff" />
          </Pressable>
        </Link>

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

        <SectionTitle
          right={
            <Link href="/catalog" style={{ color: colors.primary, fontWeight: '700' }}>
              Баары →
            </Link>
          }
        >
          Популярдуу товарлар
        </SectionTitle>
        <ProductGrid products={popular} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, gap: 4 },
  brand: { color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: 0.5 },
  tagline: { color: colors.primarySoft, fontSize: 14, marginBottom: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12 },
  body: { padding: 16, gap: 14 },
  promo: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.accent, borderRadius: radius.lg, padding: 16 },
  promoTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  promoText: { color: '#FFFBEB', fontSize: 13, marginTop: 2 },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cat: { flexBasis: '30%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: 10, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border },
  catIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  catText: { fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'center' },
});
