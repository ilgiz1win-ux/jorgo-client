import { StyleSheet, View } from 'react-native';
import { Product } from '../data/products';
import { ProductCard } from './ProductCard';

// Эки тилкелүү тор (ScrollView ичинде колдонсо болот).
export function ProductGrid({ products }: { products: Product[] }) {
  const rows: Product[][] = [];
  for (let i = 0; i < products.length; i += 2) rows.push(products.slice(i, i + 2));
  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row[0].id} style={styles.row}>
          {row.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
          {row.length === 1 && <View style={{ flex: 1 }} />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
});
