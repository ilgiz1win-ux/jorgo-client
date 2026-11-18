import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors, radius } from '../config/theme';
import { nativeDriver, useReduceMotion } from './anim';
import { useT } from '../i18n';

// Товарлар жүктөлүп жатканда боз «скелет» карточкалары жылтылдап турат
export function SkeletonGrid({ count = 4 }: { count?: number }) {
  const reduce = useReduceMotion();
  const { t } = useT();
  const pulse = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: nativeDriver }),
        Animated.timing(pulse, { toValue: 0.55, duration: 650, useNativeDriver: nativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, pulse]);

  const rows = Array.from({ length: Math.ceil(count / 2) });
  return (
    <Animated.View style={{ gap: 12, opacity: pulse }} accessibilityLabel={t('common.productsLoading')}>
      {rows.map((_, r) => (
        <View key={r} style={styles.row}>
          {[0, 1].map((c) => (
            <View key={c} style={styles.card}>
              <View style={styles.image} />
              <View style={[styles.bar, { width: '85%' }]} />
              <View style={[styles.bar, { width: '55%' }]} />
              <View style={[styles.bar, { width: '40%', height: 16, marginTop: 6 }]} />
            </View>
          ))}
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: 10, gap: 8, borderWidth: 1, borderColor: colors.border },
  image: { height: 110, borderRadius: radius.md, backgroundColor: '#E5E9EC' },
  bar: { height: 12, borderRadius: 6, backgroundColor: '#E5E9EC' },
});
