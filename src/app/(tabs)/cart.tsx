import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ProductImage } from '../../components/ProductCard';
import { Button, Card, QtyStepper } from '../../components/ui';
import { SHOP } from '../../config/shop';
import { colors } from '../../config/theme';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../lib/format';

export default function Cart() {
  const { lines, subtotal, setQty, remove, orders } = useCart();

  if (!lines.length) {
    return (
      <View style={styles.empty}>
        <MaterialCommunityIcons name="cart-outline" size={72} color={colors.muted} />
        <Text style={styles.emptyTitle}>Себет бош</Text>
        <Text style={{ color: colors.muted, textAlign: 'center' }}>Каталогдон керектүү товарларды тандаңыз</Text>
        <Button title="Каталогго өтүү" icon="view-grid" onPress={() => router.push('/catalog')} />
        {orders.length > 0 && (
          <Link href="/orders" style={styles.link}>
            Менин буйрутмаларым ({orders.length})
          </Link>
        )}
      </View>
    );
  }

  const left = SHOP.freeDeliveryFrom - subtotal;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 96 }}>
      {lines.map(({ product, qty }) => (
        <Card key={product.id} style={styles.line}>
          <Pressable style={{ width: 72 }} onPress={() => router.push(`/product/${product.id}`)}>
            <ProductImage product={product} size={36} height={72} />
          </Pressable>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.name} numberOfLines={2}>
              {product.name}
            </Text>
            <Text style={styles.price}>{formatPrice(product.price * qty)}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <QtyStepper value={qty} onChange={(v) => setQty(product.id, v)} />
              <Pressable hitSlop={8} onPress={() => remove(product.id)} accessibilityLabel="Өчүрүү">
                <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.danger} />
              </Pressable>
            </View>
          </View>
        </Card>
      ))}

      <Card style={{ gap: 8 }}>
        <View style={styles.row}>
          <Text style={{ color: colors.muted }}>Товарлар</Text>
          <Text style={{ fontWeight: '600' }}>{formatPrice(subtotal)}</Text>
        </View>
        {left > 0 ? (
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            Акысыз жеткирүүгө чейин дагы {formatPrice(left)} калды
          </Text>
        ) : (
          <Text style={{ color: colors.success, fontSize: 13, fontWeight: '600' }}>Жеткирүү акысыз!</Text>
        )}
      </Card>

      <Button title="Буйрутма берүү" icon="check-circle" onPress={() => router.push('/checkout')} />
      {orders.length > 0 && (
        <Link href="/orders" style={[styles.link, { textAlign: 'center' }]}>
          Менин буйрутмаларым ({orders.length})
        </Link>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  line: { flexDirection: 'row', gap: 12, padding: 10 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  price: { fontSize: 16, fontWeight: '800', color: colors.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { color: colors.primary, fontWeight: '700', paddingVertical: 8 },
});
