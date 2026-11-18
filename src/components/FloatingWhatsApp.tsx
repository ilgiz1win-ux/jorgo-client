import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../config/theme';
import { openWhatsApp } from '../lib/format';
import { nativeDriver, useReduceMotion } from './anim';

// Экрандын бурчунда ар дайым турган WhatsApp баскычы
export function FloatingWhatsApp({ bottomOffset = 64 }: { bottomOffset?: number }) {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const scale = useRef(new Animated.Value(reduce ? 1 : 0)).current;

  useEffect(() => {
    if (reduce) return;
    // Логотип экраны бүткөндөн кийин секирип чыгат
    Animated.sequence([
      Animated.delay(2100),
      Animated.spring(scale, { toValue: 1, speed: 10, bounciness: 12, useNativeDriver: nativeDriver }),
    ]).start();
  }, [reduce, scale]);

  return (
    <Animated.View style={[styles.wrap, { bottom: insets.bottom + bottomOffset, transform: [{ scale }] }]}>
      <Pressable
        onPress={() => openWhatsApp('Саламатсызбы! Сайттан жазып жатам.').catch(() => {})}
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel="WhatsApp аркылуу жазуу"
      >
        <MaterialCommunityIcons name="whatsapp" size={30} color="#fff" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 16 },
  btn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.whatsapp,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
});
