import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../config/theme';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { PressScale } from './anim';
import { BADGES, getCategory, Product, productPhotos } from '../data/products';
import { formatPrice } from '../lib/format';
import { useT } from '../i18n';

export function ProductImage({ product, size = 64, height = 110 }: { product: Product; size?: number; height?: number }) {
  const cat = getCategory(product.category);
  const photo = productPhotos(product)[0];
  return (
    <View style={[styles.image, { height, backgroundColor: cat.color + '18' }]}>
      {photo || product.image ? (
        <Image source={photo ? { uri: photo } : product.image!} style={styles.photo} resizeMode="cover" accessibilityLabel={product.name} />
      ) : (
        <MaterialCommunityIcons name={product.icon} size={size} color={cat.color} />
      )}
    </View>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const toast = useToast();
  const { t } = useT();
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  return (
    <Link href={`/product/${product.id}`} asChild>
      <PressScale outerStyle={{ flex: 1 }} style={styles.card}>
        <View>
          <ProductImage product={product} />
          {discount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>-{discount}%</Text>
            </View>
          )}
          {product.badge && (
            <View style={[styles.tag, { backgroundColor: BADGES[product.badge].color }]}>
              <MaterialCommunityIcons name={BADGES[product.badge].icon} size={12} color="#fff" />
              <Text style={styles.badgeText}>{t(`badge.${product.badge}`)}</Text>
            </View>
          )}
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.bottom}>
          <View style={{ flex: 1 }}>
            {product.oldPrice && <Text style={styles.old}>{formatPrice(product.oldPrice)}</Text>}
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
          </View>
          {product.inStock ? (
            <Pressable
              hitSlop={8}
              style={styles.addBtn}
              onPress={(e) => {
                e.preventDefault();
                add(product.id);
                toast.show(t('product.added'));
              }}
              accessibilityLabel={t('product.addCart')}
            >
              <MaterialCommunityIcons name="cart-plus" size={20} color="#fff" />
            </Pressable>
          ) : (
            <Text style={styles.out}>{t('product.outShort')}</Text>
          )}
        </View>
      </PressScale>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: 8, left: 8, backgroundColor: colors.danger, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tag: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  name: { fontSize: 14, fontWeight: '600', color: colors.text, minHeight: 36 },
  bottom: { flexDirection: 'row', alignItems: 'flex-end' },
  old: { fontSize: 12, color: colors.muted, textDecorationLine: 'line-through' },
  price: { fontSize: 15, fontWeight: '800', color: colors.primary },
  addBtn: { backgroundColor: colors.primary, borderRadius: 10, padding: 8 },
  out: { fontSize: 12, color: colors.muted, fontWeight: '600' },
});
