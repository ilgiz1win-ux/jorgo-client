import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../config/theme';
import { useT } from '../i18n';
import type { Broadcast } from '../lib/broadcasts';

const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Жалпы билдирмелер: сүрөт, аталыш, текст, басса — товарга же акцияга өтөт
export function BroadcastList({ items, seenBefore }: { items: Broadcast[]; seenBefore?: string }) {
  const { t } = useT();
  return (
    <View style={{ gap: 12 }}>
      {items.map((b) => {
        const fresh = !!seenBefore && b.createdAt > seenBefore;
        return (
          <Pressable key={b.id} disabled={!b.link} onPress={() => b.link && router.push(b.link as never)} style={[styles.card, fresh && styles.fresh]}>
            {!!b.imageUrl && <Image source={{ uri: b.imageUrl }} style={styles.image} resizeMode="cover" />}
            <View style={{ padding: 16, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="bullhorn-outline" size={20} color={colors.primary} />
                <Text style={styles.title}>{b.title}</Text>
                {fresh && <View style={styles.dot} />}
              </View>
              {!!b.body && <Text style={styles.body}>{b.body}</Text>}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.date}>{fmt(b.createdAt)}</Text>
                {!!b.link && <Text style={styles.link}>{t('news.open')} →</Text>}
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  fresh: { borderColor: colors.primary },
  image: { width: '100%', aspectRatio: 2 },
  title: { flex: 1, fontSize: 17, fontWeight: '800', color: colors.text },
  body: { fontSize: 15, color: colors.muted, lineHeight: 21 },
  date: { fontSize: 12, color: colors.muted },
  link: { fontSize: 13, fontWeight: '800', color: colors.primary },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});
