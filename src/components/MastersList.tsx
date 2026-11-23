import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../config/theme';
import type { Master } from '../data/content';
import { useT } from '../i18n';
import { FadeIn } from './anim';

export function MasterCard({ m, selected, onPress, index, style }: { m: Master; selected?: boolean; onPress?: () => void; index: number; style?: StyleProp<ViewStyle> }) {
  const { t } = useT();
  return (
    <FadeIn delay={index * 60}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={[styles.card, selected && styles.cardOn, style]}
        accessibilityRole={onPress ? 'radio' : undefined}
        accessibilityState={onPress ? { selected } : undefined}
        accessibilityLabel={m.name}
      >
        <View style={styles.photo}>
          {m.photoUrl ? (
            <Image source={{ uri: m.photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <MaterialCommunityIcons name="account-hard-hat" size={56} color={colors.primary} />
          )}
          {selected && (
            <View style={styles.check}>
              <MaterialCommunityIcons name="check" size={16} color="#fff" />
            </View>
          )}
        </View>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2}>
            {m.name}
          </Text>
          <View style={styles.line}>
            <MaterialCommunityIcons name="star" size={15} color="#F59E0B" />
            <Text style={styles.rating}>{m.rating.toFixed(1)}</Text>
            <Text style={styles.muted}>· {t('masters.orders', { n: m.orders })}</Text>
          </View>
          {!!m.specialty && (
            <Text style={styles.spec} numberOfLines={2}>
              {m.specialty}
            </Text>
          )}
          {!!m.experience && (
            <View style={styles.line}>
              <MaterialCommunityIcons name="medal-outline" size={14} color={colors.accent} />
              <Text style={styles.muted}>{m.experience}</Text>
            </View>
          )}
          {!!m.hoursFrom && !!m.hoursTo && (
            <View style={styles.line}>
              <MaterialCommunityIcons name="clock-outline" size={14} color={colors.muted} />
              <Text style={styles.muted}>{t('masters.hours', { from: m.hoursFrom, to: m.hoursTo })}</Text>
            </View>
          )}
          {!!m.branch && (
            <View style={styles.line}>
              <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.muted} />
              <Text style={styles.muted} numberOfLines={1}>
                {m.branch}
              </Text>
            </View>
          )}
          {m.outcall && (
            <View style={styles.outcall}>
              <MaterialCommunityIcons name="car-side" size={14} color={colors.primary} />
              <Text style={styles.outcallText} numberOfLines={2}>
                {t('masters.outcall')}
                {m.outcallNote ? `: ${m.outcallNote}` : ''}
              </Text>
            </View>
          )}
          {selected && <Text style={styles.chosen}>{t('masters.chosen')}</Text>}
        </View>
      </Pressable>
    </FadeIn>
  );
}

// Мастерлердин тизмеси сүрөттөрү менен (горизонталдуу). onSelect берилсе — тандоого болот.
export function MastersList({ masters, selectedId, onSelect }: { masters: Master[]; selectedId?: string | null; onSelect?: (id: string | null) => void }) {
  const list = masters.filter((m) => m.active);
  if (!list.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4, paddingVertical: 2 }}>
      {list.map((m, i) => (
        <MasterCard
          key={m.id}
          m={m}
          index={i}
          selected={selectedId === m.id}
          onPress={onSelect ? () => onSelect(selectedId === m.id ? null : m.id) : undefined}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { width: 180, backgroundColor: colors.card, borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.border },
  cardOn: { borderColor: colors.primary },
  photo: { height: 180, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 12, gap: 4 },
  name: { fontSize: 16, fontWeight: '800', color: colors.text },
  spec: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  muted: { fontSize: 12, color: colors.muted, flexShrink: 1 },
  rating: { fontSize: 13, fontWeight: '900', color: colors.text },
  outcall: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, backgroundColor: colors.primarySoft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, marginTop: 2 },
  outcallText: { flex: 1, fontSize: 11, fontWeight: '700', color: colors.primaryDark },
  chosen: { fontSize: 12, fontWeight: '800', color: colors.primary, marginTop: 2 },
});
