import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { SHOP } from '../config/shop';
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
        <Animated.Image
          source={require('../../assets/brand/logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Jorgo Eco Service"
        />
      </Animated.View>
    </Animated.View>
  );
}

// Логотиптин фону ак болгондуктан, экран да ак
const styles = StyleSheet.create({
  wrap: { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  logo: { width: 280, height: 158, maxWidth: '80%' },
});
