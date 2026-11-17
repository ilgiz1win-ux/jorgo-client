import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../config/theme';
import { useCart } from '../context/CartContext';
import { getCategory, Product } from '../data/products';
import { formatPrice } from '../lib/format';

export function ProductImage({ product, size = 64, height = 110 }: { product: Product; size?: number; height?: number }) {
  const cat = getCategory(product.category);
  return (
    <View style={[styles.image, { height, backgroundColor: cat.color + '18' }]}>
      {product.imageUrl || product.image ? (
        <Image source={product.imageUrl ? { uri: product.imageUrl } : product.image!} style={styles.photo} resizeMode="cover" accessibilityLabel={product.name} />
      ) : (
        <MaterialCommunityIcons name={product.icon} size={size} color={cat.color} />
      )}
    </View>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  return (
    <Link href={`/product/${product.id}`} asChild>
      <Pressable style={styles.card}>
        <View>
          <ProductImage product={product} />
          {discount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>-{discount}%</Text>
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
              }}
              accessibilityLabel="Себетке кошуу"
            >
              <MaterialCommunityIcons name="cart-plus" size={20} color="#fff" />
            </Pressable>
          ) : (
            <Text style={styles.out}>Жок</Text>
          )}
        </View>
      </Pressable>
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
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  name: { fontSize: 14, fontWeight: '600', color: colors.text, minHeight: 36 },
  bottom: { flexDirection: 'row', alignItems: 'flex-end' },
  old: { fontSize: 12, color: colors.muted, textDecorationLine: 'line-through' },
  price: { fontSize: 15, fontWeight: '800', color: colors.primary },
  addBtn: { backgroundColor: colors.primary, borderRadius: 10, padding: 8 },
  out: { fontSize: 12, color: colors.muted, fontWeight: '600' },
});
