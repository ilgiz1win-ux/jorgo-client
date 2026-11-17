import { StyleSheet, View } from 'react-native';
import { Product } from '../data/products';
import { FadeIn } from './anim';
import { ProductCard } from './ProductCard';

// Эки тилкелүү тор (ScrollView ичинде колдонсо болот).
export function ProductGrid({ products }: { products: Product[] }) {
  const rows: Product[][] = [];
  for (let i = 0; i < products.length; i += 2) rows.push(products.slice(i, i + 2));
  return (
    <View style={styles.grid}>
      {rows.map((row, r) => (
        <View key={row[0].id} style={styles.row}>
          {row.map((p, c) => (
            <FadeIn key={p.id} delay={(r * 2 + c) * 60} style={{ flex: 1 }}>
              <ProductCard product={p} />
            </FadeIn>
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
