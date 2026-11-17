import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { nativeDriver, useReduceMotion } from './anim';

export const BIKE_IMAGE = require('../../assets/brand/bike.png');
export const BIKE_RATIO = 480 / 217;

// Велосипед айдап баратканда бир аз селкилдейт
export function useBob(running: boolean) {
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!running) {
      bob.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -3, duration: 90, useNativeDriver: nativeDriver }),
        Animated.timing(bob, { toValue: 0, duration: 90, useNativeDriver: nativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [running, bob]);
  return bob;
}

// Ылдамдык сызыктары (велосипеддин артында)
export function SpeedLines({ opacity, color = '#5DAE1E' }: { opacity: Animated.AnimatedInterpolation<number> | Animated.Value; color?: string }) {
  return (
    <Animated.View pointerEvents="none" style={[styles.lines, { opacity }]}>
      {[46, 30, 54].map((w, i) => (
        <View key={i} style={[styles.line, { width: w, backgroundColor: color, marginLeft: i === 1 ? 14 : 0 }]} />
      ))}
    </Animated.View>
  );
}

/**
 * Велосипед карточканы (мисалы кирүү формасын) сол жактан сүйрөп келет:
 * экөө чогуу кирет, велосипед карточканын жогорку бурчунда токтоп, бир секирет.
 * Карточканын ичинде велосипед үчүн жогору жактан `bikeSpace(bikeWidth)` орун калтырыңыз.
 */
export const bikeSpace = (bikeWidth = 120) => bikeWidth / BIKE_RATIO - 4;

export function BikeTowIn({ children, bikeWidth = 120 }: { children: ReactNode; bikeWidth?: number }) {
  const reduce = useReduceMotion();
  const { width } = useWindowDimensions();
  const progress = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  const [riding, setRiding] = useState(!reduce);
  const bob = useBob(riding);

  useEffect(() => {
    if (reduce) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    // Токтогондо селкилдөөнү өчүрөбүз
    const t = setTimeout(() => setRiding(false), 1150);
    Animated.sequence([
      Animated.delay(150),
      Animated.timing(progress, { toValue: 1, duration: 1000, easing: Easing.out(Easing.back(1.1)), useNativeDriver: nativeDriver }),
      Animated.timing(hop, { toValue: -14, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver }),
      Animated.spring(hop, { toValue: 0, speed: 14, bounciness: 14, useNativeDriver: nativeDriver }),
    ]).start();
    return () => clearTimeout(t);
  }, [reduce, progress, hop]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-(width + bikeWidth), 0] });
  const linesOpacity = progress.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0], extrapolate: 'clamp' });
  const bikeHeight = bikeWidth / BIKE_RATIO;

  return (
    <Animated.View style={{ transform: [{ translateX }] }}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bikeOnCard,
          { top: 12, width: bikeWidth, height: bikeHeight },
          { transform: [{ translateY: Animated.add(hop, bob) }] },
        ]}
      >
        <View style={{ position: 'absolute', left: -62, top: bikeHeight * 0.35 }}>
          <SpeedLines opacity={linesOpacity} />
        </View>
        <Animated.Image source={BIKE_IMAGE} style={{ width: bikeWidth, height: bikeHeight }} resizeMode="contain" accessibilityLabel="" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  lines: { gap: 6 },
  line: { height: 4, borderRadius: 2 },
  bikeOnCard: { position: 'absolute', right: 16 },
});
