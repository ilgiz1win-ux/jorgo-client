import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ProductGrid } from '../../components/ProductGrid';
import { SkeletonGrid } from '../../components/Skeleton';
import { Chip } from '../../components/ui';
import { colors, radius } from '../../config/theme';
import { useCatalog } from '../../context/CatalogContext';
import { CATEGORIES, CategoryId } from '../../data/products';
import { useT } from '../../i18n';

type Sort = 'popular' | 'cheap' | 'expensive';

export default function Catalog() {
  const params = useLocalSearchParams<{ category?: CategoryId }>();
  const [category, setCategory] = useState<CategoryId | 'all'>(params.category ?? 'all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('popular');
  const { products, loading, refresh } = useCatalog();
  const { t } = useT();

  useEffect(() => {
    if (params.category) setCategory(params.category);
  }, [params.category]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = products.filter(
      (p) => (category === 'all' || p.category === category) && (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)),
    );
    if (sort === 'cheap') return [...filtered].sort((a, b) => a.price - b.price);
    if (sort === 'expensive') return [...filtered].sort((a, b) => b.price - a.price);
    return [...filtered].sort((a, b) => Number(!!b.popular) - Number(!!a.popular) || Number(b.inStock) - Number(a.inStock));
  }, [category, query, sort, products]);

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { paddingBottom: 96 }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      <View style={styles.search}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('common.search')}
          placeholderTextColor={colors.muted}
          style={styles.input}
          returnKeyType="search"
        />
        {query.length > 0 && <MaterialCommunityIcons name="close-circle" size={18} color={colors.muted} onPress={() => setQuery('')} />}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label={t('common.all')} active={category === 'all'} onPress={() => setCategory('all')} />
        {CATEGORIES.map((c) => (
          <Chip key={c.id} label={t(`cat.${c.id}`)} active={category === c.id} onPress={() => setCategory(c.id)} />
        ))}
      </ScrollView>

      <View style={styles.sortRow}>
        <Text style={styles.count}>{t('catalog.count', { n: list.length })}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Chip label={t('catalog.popular')} active={sort === 'popular'} onPress={() => setSort('popular')} />
          <Chip label={t('catalog.cheap')} active={sort === 'cheap'} onPress={() => setSort('cheap')} />
          <Chip label={t('catalog.expensive')} active={sort === 'expensive'} onPress={() => setSort('expensive')} />
        </View>
      </View>

      {loading && products.length === 0 ? (
        <SkeletonGrid count={6} />
      ) : list.length ? (
        <ProductGrid products={list} />
      ) : (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="package-variant" size={48} color={colors.muted} />
          <Text style={{ color: colors.muted }}>{t('catalog.empty')}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text },
  chips: { gap: 8 },
  sortRow: { gap: 8 },
  count: { color: colors.muted, fontWeight: '600' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 48 },
});
