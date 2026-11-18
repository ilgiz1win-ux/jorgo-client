import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../config/theme';
import { useCatalog } from '../../context/CatalogContext';
import { useT } from '../../i18n';

// Билдирмелер: админ панелдеги активдүү акциялар
export default function Notifications() {
  const { t } = useT();
  const { promos } = useCatalog();
  const list = promos.filter((p) => p.active);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
      {list.length === 0 && (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="bell-sleep-outline" size={44} color={colors.muted} />
          <Text style={{ color: colors.muted }}>{t('acc.noNotifications')}</Text>
        </View>
      )}
      {list.map((p) => (
        <View key={p.id} style={styles.card}>
          {!!p.imageUrl && <Image source={{ uri: p.imageUrl }} style={styles.image} resizeMode="cover" />}
          <View style={{ padding: 18, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.dot, { backgroundColor: p.color }]} />
              <Text style={styles.title}>{p.title}</Text>
            </View>
            {!!p.text && <Text style={styles.text}>{p.text}</Text>}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: 10, paddingVertical: 60 },
  card: { backgroundColor: colors.card, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  image: { width: '100%', aspectRatio: 2.2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  title: { flex: 1, fontSize: 17, fontWeight: '800', color: colors.text },
  text: { fontSize: 15, lineHeight: 21, color: colors.muted },
});
