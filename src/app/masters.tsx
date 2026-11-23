import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MasterCard } from '../components/MastersList';
import { colors } from '../config/theme';
import { useContent } from '../context/ContentContext';
import { useT } from '../i18n';

// Бардык мастерлер (сүрөттөрү менен). Басканда — ошол мастер тандалган бойдон оңдоого жазылуу.
export default function Masters() {
  const { t } = useT();
  const { masters } = useContent();
  const list = masters.filter((m) => m.active);
  const rows: (typeof list)[] = [];
  for (let i = 0; i < list.length; i += 2) rows.push(list.slice(i, i + 2));
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
      {list.length === 0 && (
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 60 }}>
          <MaterialCommunityIcons name="account-hard-hat" size={44} color={colors.muted} />
          <Text style={{ color: colors.muted }}>{t('masters.empty')}</Text>
        </View>
      )}
      {list.length > 0 && <Text style={styles.hint}>{t('masters.tapToBook')}</Text>}
      {rows.map((row, r) => (
        <View key={row[0].id} style={{ flexDirection: 'row', gap: 12 }}>
          {row.map((m, c) => (
            <View key={m.id} style={{ flex: 1 }}>
              <MasterCard m={m} index={r * 2 + c} style={{ width: '100%' }} onPress={() => router.push({ pathname: '/repair', params: { master: m.id } })} />
            </View>
          ))}
          {row.length === 1 && <View style={{ flex: 1 }} />}
        </View>
      ))}
      <Pressable style={styles.cta} onPress={() => router.push('/become-master')} accessibilityRole="button">
        <MaterialCommunityIcons name="account-hard-hat-outline" size={30} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.ctaTitle}>{t('ma.cta')}</Text>
          <Text style={styles.hint}>{t('ma.ctaSub')}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primary} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.muted, fontSize: 13 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primarySoft, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.primary, marginTop: 8 },
  ctaTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
});
