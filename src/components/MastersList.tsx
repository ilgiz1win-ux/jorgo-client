import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../config/theme';
import type { Master } from '../data/content';
import { useT } from '../i18n';
import { FadeIn } from './anim';

function MasterCard({ m, selected, onPress, index }: { m: Master; selected?: boolean; onPress?: () => void; index: number }) {
  const { t } = useT();
  return (
    <FadeIn delay={index * 60}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={[styles.card, selected && styles.cardOn]}
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
          {!!m.branch && (
            <View style={styles.line}>
              <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.muted} />
              <Text style={styles.muted} numberOfLines={1}>
                {m.branch}
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
  card: { width: 170, backgroundColor: colors.card, borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.border },
  cardOn: { borderColor: colors.primary },
  photo: { height: 180, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 12, gap: 4 },
  name: { fontSize: 16, fontWeight: '800', color: colors.text },
  spec: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  muted: { fontSize: 12, color: colors.muted, flexShrink: 1 },
  chosen: { fontSize: 12, fontWeight: '800', color: colors.primary, marginTop: 2 },
});
