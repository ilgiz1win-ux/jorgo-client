import { ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

// Вебде native driver жок
export const nativeDriver = Platform.OS !== 'web';

// Телефондо «Азыраак кыймыл» (Reduce Motion) күйгүзүлсө, анимация көрсөтпөйбүз
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduce)
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

// Ачылганда ылдыйдан жумшак пайда болот
export function FadeIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) {
      v.setValue(1);
      return;
    }
    Animated.timing(v, {
      toValue: 1,
      duration: 320,
      delay: Math.min(delay, 400),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: nativeDriver,
    }).start();
  }, [reduce, delay, v]);
  return (
    <Animated.View
      style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}
    >
      {children}
    </Animated.View>
  );
}

// Басканда бир аз кичирейет
export function PressScale({
  style,
  outerStyle,
  children,
  ...props
}: PressableProps & { style?: StyleProp<ViewStyle>; outerStyle?: StyleProp<ViewStyle>; children: ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: nativeDriver, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable
      {...props}
      style={outerStyle}
      onPressIn={(e) => {
        to(0.96);
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        props.onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

// Секирип чоңоюп чыгат (ийгилик белгиси үчүн)
export function PopIn({ children }: { children: ReactNode }) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) return v.setValue(1);
    Animated.spring(v, { toValue: 1, useNativeDriver: nativeDriver, speed: 8, bounciness: 14 }).start();
  }, [reduce, v]);
  return <Animated.View style={{ opacity: v, transform: [{ scale: v }] }}>{children}</Animated.View>;
}
