import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, ImageBackground, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../config/theme';
import type { Review, SiteSettings, Stat } from '../data/content';
import { BIKE_IMAGE, BIKE_RATIO } from './BikeRide';
import { PressScale } from './anim';

// Чоң баннер: админден жүктөлгөн сүрөт болсо фон, болбосо бренд түсү + логотиптеги велосипед
export function HeroBanner({ settings }: { settings: SiteSettings }) {
  const content = (
    <View style={[styles.heroInner, settings.heroImageUrl && styles.heroOverlay]}>
      <Text style={styles.heroTitle}>{settings.heroTitle}</Text>
      {!!settings.heroText && <Text style={styles.heroText}>{settings.heroText}</Text>}
      <PressScale onPress={() => router.push('/catalog')} style={styles.heroBtn} accessibilityRole="button">
        <Text style={styles.heroBtnText}>Каталогду көрүү</Text>
        <MaterialCommunityIcons name="arrow-right" size={18} color={colors.ink} />
      </PressScale>
    </View>
  );

  if (settings.heroImageUrl) {
    return (
      <ImageBackground source={{ uri: settings.heroImageUrl }} style={styles.hero} imageStyle={{ borderRadius: radius.lg }} resizeMode="cover">
        {content}
      </ImageBackground>
    );
  }
  return (
    <View style={[styles.hero, { backgroundColor: colors.ink }]}>
      <Image source={BIKE_IMAGE} style={styles.heroBike} resizeMode="contain" />
      {content}
    </View>
  );
}

// Сандар: жазылуучулар, филиалдар, кепилдик, иш убактысы
export function StatsRow({ stats }: { stats: Stat[] }) {
  return (
    <View style={styles.stats}>
      {stats.slice(0, 4).map((s, i) => (
        <View key={i} style={styles.stat}>
          <Text style={styles.statValue} numberOfLines={1}>
            {s.value}
          </Text>
          <Text style={styles.statLabel} numberOfLines={2}>
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row' }} accessibilityLabel={`${rating} жылдыз`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <MaterialCommunityIcons key={n} name={n <= rating ? 'star' : 'star-outline'} size={size} color="#F59E0B" />
      ))}
    </View>
  );
}

// Кардарлардын пикирлери (туурасынан сүрүлөт)
export function ReviewsCarousel({ reviews }: { reviews: Review[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
      {reviews.map((r) => (
        <View key={r.id} style={styles.review}>
          <MaterialCommunityIcons name="format-quote-open" size={26} color={colors.lime} />
          <Text style={styles.reviewText} numberOfLines={5}>
            {r.text}
          </Text>
          <View style={styles.reviewFoot}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{r.name.trim().charAt(0).toUpperCase() || '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.reviewName} numberOfLines={1}>
                {r.name}
              </Text>
              <Stars rating={r.rating} size={14} />
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// «Чейин / Кийин» бир жуп сүрөт
export function BeforeAfter({ title, beforeUrl, afterUrl }: { title: string; beforeUrl?: string; afterUrl?: string }) {
  const half = (label: string, url?: string, highlight?: boolean) => (
    <View style={{ flex: 1 }}>
      {url ? <Image source={{ uri: url }} style={styles.baImg} resizeMode="cover" /> : <View style={[styles.baImg, { backgroundColor: '#E5E9EC' }]} />}
      <View style={[styles.baTag, highlight && { backgroundColor: colors.primary }]}>
        <Text style={styles.baTagText}>{label}</Text>
      </View>
    </View>
  );
  return (
    <View style={styles.ba}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {half('Чейин', beforeUrl)}
        {half('Кийин', afterUrl, true)}
      </View>
      {!!title && <Text style={styles.baTitle}>{title}</Text>}
    </View>
  );
}

const BIKE_W = 170;

const styles = StyleSheet.create({
  hero: { borderRadius: radius.lg, overflow: 'hidden', minHeight: 230 },
  heroInner: { flex: 1, padding: 18, gap: 8, justifyContent: 'flex-end' },
  heroOverlay: { backgroundColor: 'rgba(17, 24, 39, 0.5)' },
  heroBike: { position: 'absolute', right: -14, top: 10, width: BIKE_W, height: BIKE_W / BIKE_RATIO },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '900' },
  heroText: { color: '#E5E7EB', fontSize: 14, maxWidth: '90%' },
  heroBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.lime, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, marginTop: 4 },
  heroBtnText: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 16, fontWeight: '900', color: colors.primary },
  statLabel: { fontSize: 11, color: colors.muted, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  review: { width: 270, backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, gap: 8, borderWidth: 1, borderColor: colors.border },
  reviewText: { fontSize: 14, lineHeight: 20, color: colors.text, minHeight: 60 },
  reviewFoot: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '900', fontSize: 16 },
  reviewName: { fontWeight: '700', color: colors.text },
  ba: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 8, gap: 8, borderWidth: 1, borderColor: colors.border },
  baImg: { width: '100%', aspectRatio: 1, borderRadius: radius.md },
  baTag: { position: 'absolute', left: 8, top: 8, backgroundColor: 'rgba(17,24,39,0.75)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  baTagText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  baTitle: { fontSize: 14, fontWeight: '700', color: colors.text, paddingHorizontal: 4, paddingBottom: 4 },
});

