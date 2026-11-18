import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { nativeDriver } from '../components/anim';
import { colors } from '../config/theme';

type ToastContextValue = { show: (text: string) => void };

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

// Экрандын ылдый жагында кыска билдирүү (мисалы «Себетке кошулду»)
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const v = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (t: string) => {
      setText(t);
      if (timer.current) clearTimeout(timer.current);
      v.stopAnimation();
      Animated.timing(v, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
      timer.current = setTimeout(() => {
        Animated.timing(v, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: nativeDriver }).start();
      }, 1800);
    },
    [v],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <Animated.View
        pointerEvents="none"
        accessibilityLiveRegion="polite"
        style={[
          styles.toast,
          {
            bottom: insets.bottom + 140,
            opacity: v,
            transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
          },
        ]}
      >
        <MaterialCommunityIcons name="check-circle" size={20} color="#4ADE80" />
        <Text style={styles.text}>{text}</Text>
      </Animated.View>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.text,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    maxWidth: '90%',
  },
  text: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
