import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhotoGallery } from '../../components/PhotoGallery';
import { ProductImage } from '../../components/ProductCard';
import { ProductGrid } from '../../components/ProductGrid';
import { Button, Card, QtyStepper, SectionTitle } from '../../components/ui';
import { colors } from '../../config/theme';
import { useCart } from '../../context/CartContext';
import { useCatalog } from '../../context/CatalogContext';
import { useToast } from '../../context/ToastContext';
import { BADGES, getCategory, productPhotos } from '../../data/products';
import { formatPrice, openWhatsApp } from '../../lib/format';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getProduct, products } = useCatalog();
  const product = getProduct(id);
  const { add } = useCart();
  const toast = useToast();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const insets = useSafeAreaInsets();

  if (!product) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Товар табылган жок</Text>
      </View>
    );
  }

  const cat = getCategory(product.category);
  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: cat.title }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        {productPhotos(product).length > 1 ? (
          <PhotoGallery photos={productPhotos(product)} label={product.name} />
        ) : (
          <ProductImage product={product} size={120} height={300} />
        )}
        {product.badge && (
          <View style={[styles.badge, { backgroundColor: BADGES[product.badge].color }]}>
            <MaterialCommunityIcons name={BADGES[product.badge].icon} size={14} color="#fff" />
            <Text style={styles.badgeText}>{BADGES[product.badge].label}</Text>
          </View>
        )}
        <View style={{ gap: 6 }}>
          <Text style={styles.name}>{product.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
            {product.oldPrice && <Text style={styles.old}>{formatPrice(product.oldPrice)}</Text>}
          </View>
          <View style={styles.stock}>
            <MaterialCommunityIcons
              name={product.inStock ? 'check-circle' : 'clock-outline'}
              size={16}
              color={product.inStock ? colors.success : colors.accent}
            />
            <Text style={{ color: product.inStock ? colors.success : colors.accent, fontWeight: '600' }}>
              {product.inStock ? 'Сатыкта бар' : 'Буйрутма менен'}
            </Text>
          </View>
        </View>

        <Text style={styles.desc}>{product.description}</Text>

        <Card style={{ padding: 0 }}>
          {product.specs.map(([k, v], i) => (
            <View key={k} style={[styles.spec, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <Text style={{ color: colors.muted }}>{k}</Text>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{v}</Text>
            </View>
          ))}
        </Card>

        <Button
          title="WhatsApp аркылуу суроо"
          icon="whatsapp"
          variant="outline"
          onPress={() => openWhatsApp(`Саламатсызбы! "${product.name}" (${formatPrice(product.price)}) боюнча суроом бар.`)}
        />

        {related.length > 0 && (
          <>
            <SectionTitle>Окшош товарлар</SectionTitle>
            <ProductGrid products={related} />
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <QtyStepper value={qty} onChange={setQty} />
        <Button
          style={{ flex: 1 }}
          title={added ? 'Себетке өтүү' : product.inStock ? 'Себетке кошуу' : 'Буйрутма берүү'}
          icon={added ? 'cart-arrow-right' : 'cart-plus'}
          onPress={() => {
            if (added) return router.push('/cart');
            add(product.id, qty);
            setAdded(true);
            toast.show(`Себетке кошулду: ${qty} даана`);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  name: { fontSize: 22, fontWeight: '800', color: colors.text },
  price: { fontSize: 24, fontWeight: '900', color: colors.primary },
  old: { fontSize: 16, color: colors.muted, textDecorationLine: 'line-through' },
  stock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  desc: { fontSize: 15, lineHeight: 22, color: colors.text },
  spec: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
});
