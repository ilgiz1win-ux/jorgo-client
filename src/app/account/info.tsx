import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../config/theme';
import { useRentRules } from '../../hooks/useRentRules';
import { useT } from '../../i18n';

// Ижара шарттары же жеке маалыматты иштетүү саясаты
export default function Info() {
  const { t } = useT();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const { rules } = useRentRules();
  const isTerms = type === 'terms';
  const lines = isTerms
    ? rules
    : t('acc.privacyFull').split('\n').filter(Boolean);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: isTerms ? t('acc.rentTerms') : t('acc.privacy') }} />
      <View style={styles.card}>
        {lines.length === 0 && <Text style={styles.text}>—</Text>}
        {lines.map((l, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
            {isTerms && <MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.primary} style={{ marginTop: 2 }} />}
            <Text style={styles.text}>{l}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 24, padding: 18, gap: 12, borderWidth: 1, borderColor: colors.border },
  text: { flex: 1, fontSize: 15, lineHeight: 22, color: colors.text },
});
