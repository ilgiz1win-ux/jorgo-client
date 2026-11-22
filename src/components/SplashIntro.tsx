import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors } from '../config/theme';
import { SHOP } from '../config/shop';
import { nativeDriver, useReduceMotion } from './anim';
import { BIKE_IMAGE, BIKE_RATIO, SpeedLines, useBob } from './BikeRide';
import { useT } from '../i18n';

const TEXT_IMAGE = require('../../assets/brand/logo-text.png');
const TEXT_RATIO = 640 / 198;

// Колдонмо ачылганда: логотиптеги велосипед сол жактан айдап келип ортодо токтойт,
// астынан «Jorgo Eco Service» жазуусу көтөрүлүп логотип чогулат, андан кийин ураан
// («Биз менен баары жеңилирээк») сөз-сөз болуп секирип чыгат, анан экран жоголот.
// Болжол менен 3 секунд. Экранга басууларды бөгөбөйт.
export function SplashIntro() {
  const reduce = useReduceMotion();
  const { t } = useT();
  const { width } = useWindowDimensions();
  const [visible, setVisible] = useState(true);
  const [riding, setRiding] = useState(!reduce);
  const ride = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  // Ураандын ар бир сөзү өзүнчө кыймылдайт (тил боюнча которулат)
  const words = t('home.slogan').split(/\s+/).filter(Boolean).slice(0, 8);
  const wordAnims = useRef(Array.from({ length: 8 }, () => new Animated.Value(reduce ? 1 : 0))).current;
  const line = useRef(new Animated.Value(reduce ? 1 : 0)).current;
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
          // Ураан: сөздөр бирин-бири ээрчип, астынан секирип чыгат
          Animated.stagger(
            130,
            wordAnims.slice(0, words.length).map((v) =>
              Animated.spring(v, { toValue: 1, speed: 14, bounciness: 10, useNativeDriver: nativeDriver }),
            ),
          ),
          // Астынан ачык жашыл сызык созулат
          Animated.timing(line, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }),
          Animated.delay(550),
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
  }, [reduce, ride, tilt, text, fade, line]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  const bikeX = ride.interpolate({ inputRange: [0, 1], outputRange: [-(width / 2 + bikeW), 0] });
  const linesOpacity = ride.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });
  const rotate = tilt.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '6deg'] });

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wrap, { opacity: fade }]} accessibilityLabel={`${SHOP.name} — ${t('common.loading')}`}>
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
      <View style={[styles.slogan, { maxWidth: width * 0.86 }]} accessibilityLabel={t('home.slogan')}>
        {words.map((w, i) => (
          <Animated.View
            key={i}
            style={{
              opacity: wordAnims[i],
              transform: [
                { translateY: wordAnims[i].interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
                { scale: wordAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
              ],
            }}
          >
            <Text style={styles.word}>{w}</Text>
          </Animated.View>
        ))}
      </View>
      <Animated.View style={[styles.line, { width: Math.min(220, width * 0.55), transform: [{ scaleX: line }] }]} />
    </Animated.View>
  );
}

// Логотиптин фону ак болгондуктан, экран да ак
const styles = StyleSheet.create({
  wrap: { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', zIndex: 100, overflow: 'hidden' },
  slogan: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 14 },
  word: { fontSize: 20, fontWeight: '900', color: colors.primary },
  line: { height: 4, borderRadius: 2, backgroundColor: colors.lime, marginTop: 8 },
});
