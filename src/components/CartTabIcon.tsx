import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, ColorValue } from 'react-native';
import { useCart } from '../context/CartContext';
import { nativeDriver, useReduceMotion } from './anim';

// Себетке товар кошулганда иконка «секирет»
export function CartTabIcon({ color, size }: { color: ColorValue; size: number }) {
  const { count } = useCart();
  const reduce = useReduceMotion();
  const prev = useRef(count);
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (count > prev.current && !reduce) {
      scale.setValue(1);
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.35, duration: 140, useNativeDriver: nativeDriver }),
        Animated.spring(scale, { toValue: 1, speed: 14, bounciness: 16, useNativeDriver: nativeDriver }),
      ]).start();
    }
    prev.current = count;
  }, [count, reduce, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <MaterialCommunityIcons name="cart" color={color as string} size={size} />
    </Animated.View>
  );
}
