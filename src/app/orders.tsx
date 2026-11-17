import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '../components/ui';
import { colors } from '../config/theme';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/format';

export default function Orders() {
  const { orders } = useCart();
  if (!orders.length) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.muted }}>Азырынча буйрутма жок</Text>
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {orders.map((o) => (
        <Card key={o.id} style={{ gap: 6 }}>
          <View style={styles.row}>
            <Text style={styles.h}>№{o.id}</Text>
            <Text style={{ color: colors.muted }}>{new Date(o.date).toLocaleDateString('ru-RU')}</Text>
          </View>
          {o.items.map((it) => (
            <Text key={it.name} style={{ color: colors.text }}>
              • {it.name} × {it.qty}
            </Text>
          ))}
          <Text style={[styles.h, { color: colors.primary }]}>{formatPrice(o.total)}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  h: { fontSize: 16, fontWeight: '800', color: colors.text },
});
