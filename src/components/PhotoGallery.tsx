import { useState } from 'react';
import { Image, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../config/theme';
import { useT } from '../i18n';

// Товардын сүрөттөрү: солго-оңго сүрүп көрүү, астында чекиттер
export function PhotoGallery({ photos, height = 300, label }: { photos: string[]; height?: number; label: string }) {
  const [width, setWidth] = useState(0);
  const { t } = useT();
  const [index, setIndex] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  return (
    <View onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))} style={{ gap: 8 }}>
      <View style={[styles.frame, { height }]}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={32}>
          {photos.map((uri, i) => (
            <Image key={uri} source={{ uri }} style={{ width, height }} resizeMode="cover" accessibilityLabel={t('common.photoN', { label, n: i + 1 })} />
          ))}
        </ScrollView>
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {index + 1} / {photos.length}
          </Text>
        </View>
      </View>
      <View style={styles.dots}>
        {photos.map((uri, i) => (
          <View key={uri} style={[styles.dot, i === index && styles.dotOn]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#E5E9EC' },
  counter: { position: 'absolute', right: 10, bottom: 10, backgroundColor: 'rgba(17,24,39,0.7)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  counterText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotOn: { width: 20, backgroundColor: colors.primary },
});
