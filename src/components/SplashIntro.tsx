import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SHOP } from '../config/shop';
import { nativeDriver, useReduceMotion } from './anim';
import { BIKE_IMAGE, BIKE_RATIO, SpeedLines, useBob } from './BikeRide';

const TEXT_IMAGE = require('../../assets/brand/logo-text.png');
const TEXT_RATIO = 640 / 198;

// Колдонмо ачылганда: логотиптеги велосипед сол жактан айдап келип ортодо токтойт,
// астынан «Jorgo Eco Service» жазуусу көтөрүлүп логотип чогулат, анан экран жоголот.
// Болжол менен 2 секунд. Экранга басууларды бөгөбөйт.
export function SplashIntro() {
  const reduce = useReduceMotion();
  const { width } = useWindowDimensions();
  const [visible, setVisible] = useState(true);
  const [riding, setRiding] = useState(!reduce);
  const ride = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const bob = useBob(riding);

  const bikeW = Math.min(240, width * 0.62);
  const bikeH = bikeW / BIKE_RATIO;
  const textW = Math.min(280, width * 0.72);
  const textH = textW / TEXT_RATIO;

  useEffect(() => {
    const steps = reduce
      ? [Animated.delay(500)]
      : [
          Animated.timing(ride, { toValue: 1, duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }),
          // Токтогондо алдыга бир аз ыргылып, кайра түздөлөт
          Animated.parallel([
            Animated.sequence([
              Animated.timing(tilt, { toValue: 1, duration: 120, useNativeDriver: nativeDriver }),
              Animated.spring(tilt, { toValue: 0, speed: 12, bounciness: 12, useNativeDriver: nativeDriver }),
            ]),
            Animated.timing(text, { toValue: 1, duration: 420, delay: 80, easing: Easing.out(Easing.back(1.4)), useNativeDriver: nativeDriver }),
          ]),
          Animated.delay(450),
        ];
    const anim = Animated.sequence([
      ...steps,
      Animated.timing(fade, { toValue: 0, duration: 300, easing: Easing.in(Easing.cubic), useNativeDriver: nativeDriver }),
    ]);
    const stopRiding = reduce ? null : setTimeout(() => setRiding(false), 750);
    anim.start(() => setVisible(false));
    return () => {
      anim.stop();
      if (stopRiding) clearTimeout(stopRiding);
    };
  }, [reduce, ride, tilt, text, fade]);

  if (!visible) return null;

  const bikeX = ride.interpolate({ inputRange: [0, 1], outputRange: [-(width / 2 + bikeW), 0] });
  const linesOpacity = ride.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });
  const rotate = tilt.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '6deg'] });

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wrap, { opacity: fade }]} accessibilityLabel={`${SHOP.name} жүктөлүүдө`}>
      <Animated.View style={{ width: bikeW, height: bikeH, transform: [{ translateX: bikeX }, { translateY: bob }, { rotate }] }}>
        <View style={{ position: 'absolute', left: -70, top: bikeH * 0.4 }}>
          <SpeedLines opacity={linesOpacity} />
        </View>
        <Animated.Image source={BIKE_IMAGE} style={{ width: bikeW, height: bikeH }} resizeMode="contain" />
      </Animated.View>
      <Animated.Image
        source={TEXT_IMAGE}
        accessibilityLabel="Jorgo Eco Service"
        resizeMode="contain"
        style={{
          width: textW,
          height: textH,
          marginTop: 4,
          opacity: text,
          transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        }}
      />
    </Animated.View>
  );
}

// Логотиптин фону ак болгондуктан, экран да ак
const styles = StyleSheet.create({
  wrap: { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', zIndex: 100, overflow: 'hidden' },
});
