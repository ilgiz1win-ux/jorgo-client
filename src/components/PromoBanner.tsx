import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ImageBackground, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { radius } from '../config/theme';
import type { Promo } from '../data/products';

// Акция баннери: сүрөт болсо фон катары, болбосо тандалган түс
export function PromoBanner({ promo, style }: { promo: Pick<Promo, 'title' | 'text' | 'color' | 'imageUrl'>; style?: StyleProp<ViewStyle> }) {
  const content = (
    <View style={[styles.inner, promo.imageUrl && styles.overlay]}>
      <View style={styles.tag}>
        <MaterialCommunityIcons name="sale" size={14} color={promo.color} />
        <Text style={[styles.tagText, { color: promo.color }]}>Акция</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {promo.title}
      </Text>
      {!!promo.text && (
        <Text style={styles.text} numberOfLines={2}>
          {promo.text}
        </Text>
      )}
    </View>
  );

  if (promo.imageUrl) {
    return (
      <ImageBackground source={{ uri: promo.imageUrl }} style={[styles.box, style]} imageStyle={{ borderRadius: radius.lg }} resizeMode="cover">
        {content}
      </ImageBackground>
    );
  }
  return <View style={[styles.box, { backgroundColor: promo.color }, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.lg, overflow: 'hidden', minHeight: 150 },
  inner: { flex: 1, padding: 16, gap: 6, justifyContent: 'flex-end' },
  // Сүрөттүн үстүндөгү текст окулушу үчүн караңгы катмар
  overlay: { backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { fontSize: 12, fontWeight: '800' },
  title: { color: '#fff', fontSize: 20, fontWeight: '900' },
  text: { color: '#fff', fontSize: 14, opacity: 0.95 },
});
