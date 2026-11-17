import { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { colors } from '../config/theme';
import type { Promo } from '../data/products';
import { useReduceMotion } from './anim';
import { PromoBanner } from './PromoBanner';

const INTERVAL = 4000;

// Акция баннерлери: 4 секунд сайын өзү алмашат, колу менен да сүрсө болот
export function PromoCarousel({ promos }: { promos: Promo[] }) {
  const reduce = useReduceMotion();
  const ref = useRef<ScrollViewInstance>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = promos.length;

  const goTo = (i: number) => {
    if (!width) return;
    const next = ((i % count) + count) % count;
    ref.current?.scrollTo({ x: next * width, animated: !reduce });
    setIndex(next);
  };

  useEffect(() => {
    if (count < 2 || paused || !width) return;
    const t = setTimeout(() => goTo(index + 1), INTERVAL);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused, width, count]);

  // Акциялардын саны азайса, чектен чыкпайлы
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  // Сүрүп жатканда кайсы баннер көрүнүп турганын эсептейбиз
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index && i >= 0 && i < count) setIndex(i);
  };

  if (count === 0) return null;
  if (count === 1) return <PromoBanner promo={promos[0]} />;

  return (
    <View onLayout={onLayout} style={{ gap: 8 }}>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        onScrollBeginDrag={() => setPaused(true)}
        onScrollEndDrag={() => setPaused(false)}
        scrollEventThrottle={32}
      >
        {promos.map((p) => (
          <View key={p.id} style={{ width }}>
            <PromoBanner promo={p} />
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {promos.map((p, i) => (
          <Pressable key={p.id} onPress={() => goTo(i)} hitSlop={6} accessibilityLabel={`Акция ${i + 1}`}>
            <View style={[styles.dot, i === index && styles.dotOn]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotOn: { width: 20, backgroundColor: colors.primary },
});
