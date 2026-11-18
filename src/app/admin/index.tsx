import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { ProductImage } from '../../components/ProductCard';
import { Button, Card, Chip } from '../../components/ui';
import { isRemote } from '../../config/backend';
import { adminColors, colors, radius } from '../../config/theme';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useCatalog } from '../../context/CatalogContext';
import { CATEGORIES, CategoryId, IconName } from '../../data/products';
import { formatPrice } from '../../lib/format';

const SECTIONS: { href: '/admin/stats' | '/admin/home' | '/admin/promos' | '/admin/services' | '/admin/reviews' | '/admin/gallery'; title: string; text: string; icon: IconName; color: string }[] = [
  { href: '/admin/stats', title: 'Статистика', text: 'Канча адам кирди, буйрутмалар', icon: 'chart-bar', color: '#111827' },
  { href: '/admin/home', title: 'Башкы бет', text: 'Чоң баннер жана сандар', icon: 'home-edit', color: '#2E7D32' },
  { href: '/admin/promos', title: 'Акциялар', text: 'Баннерлер жана слайдер', icon: 'bullhorn', color: '#7C3AED' },
  { href: '/admin/services', title: 'Оңдоо', text: 'Кызматтар жана баалар', icon: 'wrench', color: '#EA580C' },
  { href: '/admin/reviews', title: 'Пикирлер', text: 'Кардарлардын сөздөрү', icon: 'star', color: '#CA8A04' },
  { href: '/admin/gallery', title: 'Галерея', text: 'Чейин / кийин сүрөттөр', icon: 'image-multiple', color: '#0284C7' },
];

export default function AdminHome() {
  const { products, promos, loading, refresh, saveProduct, seedProducts } = useCatalog();
  const { logout, email } = useAdminAuth();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryId | 'all'>('all');
  const [error, setError] = useState<string | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => (category === 'all' || p.category === category) && (!q || p.name.toLowerCase().includes(q)));
  }, [products, query, category]);

  const stats = {
    total: products.length,
    out: products.filter((p) => !p.inStock).length,
    sale: products.filter((p) => p.oldPrice).length,
    promos: promos.filter((p) => p.active).length,
  };

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ката кетти');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={logout} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialCommunityIcons name="logout" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600' }}>Чыгуу</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        <View style={[styles.mode, { backgroundColor: isRemote ? '#DCFCE7' : '#FEF3C7' }]}>
          <MaterialCommunityIcons name={isRemote ? 'cloud-check' : 'cellphone'} size={18} color={isRemote ? colors.success : '#B45309'} />
          <Text style={{ flex: 1, color: colors.text, fontSize: 13 }}>
            {isRemote
              ? `Сервер туташкан (${email}). Өзгөртүүлөр бардык кардарларга дароо көрүнөт.`
              : 'Демо режим: өзгөртүүлөр ушул түзмөктө гана сакталат. Кардарларга жетүүсү үчүн Supabase туташтырыңыз.'}
          </Text>
        </View>

        <View style={styles.stats}>
          <Stat icon="package-variant" label="Товар" value={stats.total} color={colors.primary} />
          <Stat icon="close-circle-outline" label="Жок" value={stats.out} color={colors.danger} />
          <Stat icon="sale" label="Арзандатуу" value={stats.sale} color={colors.accent} />
          <Stat icon="bullhorn" label="Акция" value={stats.promos} color="#7C3AED" />
        </View>

        <View style={styles.tiles}>
          {SECTIONS.map((t) => (
            <Pressable key={t.href} style={[styles.tile, { backgroundColor: t.color }]} onPress={() => router.push(t.href)}>
              <MaterialCommunityIcons name={t.icon} size={26} color="#fff" />
              <Text style={styles.tileTitle}>{t.title}</Text>
              <Text style={styles.tileText} numberOfLines={2}>
                {t.text}
              </Text>
            </Pressable>
          ))}
        </View>

        {error && <Text style={{ color: colors.danger }}>{error}</Text>}

        <View style={styles.search}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Товар издөө…" placeholderTextColor={colors.muted} style={styles.input} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label="Баары" active={category === 'all'} onPress={() => setCategory('all')} />
          {CATEGORIES.map((c) => (
            <Chip key={c.id} label={c.title} active={category === c.id} onPress={() => setCategory(c.id)} />
          ))}
        </ScrollView>

        {products.length === 0 && !loading && (
          <Card style={{ alignItems: 'center', gap: 10 }}>
            <Text style={{ color: colors.muted, textAlign: 'center' }}>Азырынча товар жок. Жаңы товар кошуңуз же мисал товарларды жүктөңүз.</Text>
            <Button title="Мисал товарларды жүктөө" variant="outline" icon="database-import" onPress={() => run(seedProducts)} />
          </Card>
        )}

        {list.map((p) => (
          <Pressable key={p.id} onPress={() => router.push(`/admin/product/${p.id}`)}>
            <Card style={styles.row}>
              <View style={{ width: 64 }}>
                <ProductImage product={p} size={30} height={64} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.name} numberOfLines={2}>
                  {p.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={styles.price}>{formatPrice(p.price)}</Text>
                  {p.oldPrice && <Text style={styles.old}>{formatPrice(p.oldPrice)}</Text>}
                  {p.popular && <MaterialCommunityIcons name="star" size={14} color={colors.accent} />}
                </View>
                <Text style={{ fontSize: 12, color: p.inStock ? colors.success : colors.danger, fontWeight: '600' }}>
                  {p.inStock ? 'Сатыкта бар' : 'Сатыкта жок'}
                </Text>
              </View>
              <Switch
                value={p.inStock}
                onValueChange={(v) => run(() => saveProduct({ ...p, inStock: v }))}
                trackColor={{ true: colors.primary, false: colors.border }}
                accessibilityLabel="Сатыкта бар"
              />
            </Card>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => router.push('/admin/product/new')} accessibilityLabel="Жаңы товар">
        <MaterialCommunityIcons name="plus" size={26} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Товар кошуу</Text>
      </Pressable>
    </View>
  );
}

function Stat({ icon, label, value, color }: { icon: IconName; label: string; value: number; color: string }) {
  return (
    <View style={styles.stat}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mode: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: 10, alignItems: 'center', gap: 2, borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 20, fontWeight: '900', color: colors.text, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexBasis: '47%', flexGrow: 1, borderRadius: radius.lg, padding: 14, gap: 4 },
  tileTitle: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 4 },
  tileText: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  price: { fontSize: 15, fontWeight: '800', color: colors.primary },
  old: { fontSize: 12, color: colors.muted, textDecorationLine: 'line-through' },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: adminColors.header,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
});
