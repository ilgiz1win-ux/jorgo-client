import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { SHOP } from '../config/shop';
import { colors } from '../config/theme';
import { nativeDriver, useReduceMotion } from './anim';

// Колдонмо ачылганда кыска логотип экраны (болжол менен 1.3 секунд).
// Экранга басууларды бөгөбөйт.
export function SplashIntro() {
  const reduce = useReduceMotion();
  const [visible, setVisible] = useState(true);
  const logo = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.timing(logo, { toValue: 1, duration: 500, easing: Easing.out(Easing.back(1.6)), useNativeDriver: nativeDriver }),
      Animated.delay(reduce ? 150 : 450),
      Animated.timing(fade, { toValue: 0, duration: 320, easing: Easing.in(Easing.cubic), useNativeDriver: nativeDriver }),
    ]);
    if (reduce) logo.setValue(1);
    anim.start(() => setVisible(false));
    return () => anim.stop();
  }, [reduce, logo, fade]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.wrap, { opacity: fade }]}
      accessibilityLabel={`${SHOP.name} жүктөлүүдө`}>
      <Animated.View
        style={{
          alignItems: 'center',
          opacity: logo,
          transform: [
            { scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
            { translateY: logo.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
          ],
        }}
      >
        <View style={styles.circle}>
          <MaterialCommunityIcons name="bicycle-electric" size={64} color={colors.primary} />
        </View>
        <Text style={styles.brand}>{SHOP.name}</Text>
        <Text style={styles.sub}>ECO SERVICE</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  circle: { width: 116, height: 116, borderRadius: 58, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  brand: { color: '#fff', fontSize: 42, fontWeight: '900', letterSpacing: 1 },
  sub: { color: colors.primarySoft, fontSize: 14, fontWeight: '700', letterSpacing: 4, marginTop: 2 },
});
