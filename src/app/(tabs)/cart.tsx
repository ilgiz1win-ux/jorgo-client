import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ProductImage } from '../../components/ProductCard';
import { Button, Card, QtyStepper } from '../../components/ui';
import { SHOP } from '../../config/shop';
import { colors } from '../../config/theme';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../lib/format';
import { useT } from '../../i18n';
import { MyOrders } from '../../components/orders/MyOrders';

export default function Cart() {
  const { lines, subtotal, setQty, remove } = useCart();
  const { t } = useT();

  if (!lines.length) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 96 }}>
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons name="cart-outline" size={48} color={colors.muted} />
          <Text style={styles.emptyTitle}>{t('cart.empty')}</Text>
          <Button title={t('common.goCatalog')} icon="view-grid" variant="outline" onPress={() => router.push('/catalog')} />
        </View>
        <MyOrders />
      </ScrollView>
    );
  }

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
              <Pressable hitSlop={8} onPress={() => remove(product.id)} accessibilityLabel={t('common.delete')}>
                <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.danger} />
              </Pressable>
            </View>
          </View>
        </Card>
      ))}

      <Card style={{ gap: 8 }}>
        <View style={styles.row}>
          <Text style={{ color: colors.muted }}>{t('cart.items')}</Text>
          <Text style={{ fontWeight: '600' }}>{formatPrice(subtotal)}</Text>
        </View>
        <Text style={{ color: colors.muted, fontSize: 13 }}>{t('cart.pickupNote')}</Text>
      </Card>

      <Button title={t('cart.checkout')} icon="check-circle" onPress={() => router.push('/checkout')} />
      <MyOrders />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  emptyBox: { alignItems: 'center', gap: 10, padding: 18, backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  line: { flexDirection: 'row', gap: 12, padding: 10 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  price: { fontSize: 16, fontWeight: '800', color: colors.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { color: colors.primary, fontWeight: '700', paddingVertical: 8 },
});
