import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../config/theme';
import { useT } from '../../i18n';
import { Relative, RELATIVES_REQUIRED, relativeValid } from '../../lib/account';
import { Field } from '../ui';

const empty: Relative = { name: '', relation: '', phone: '' };

// Эки тууганынын аты-жөнү, ким болору жана телефону
export function RelativesForm({ value, onChange }: { value: Relative[]; onChange: (v: Relative[]) => void }) {
  const { t } = useT();
  const list = Array.from({ length: Math.max(RELATIVES_REQUIRED, value.length) }, (_, i) => value[i] ?? empty);
  const set = (i: number, k: keyof Relative, v: string) => onChange(list.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 4, paddingHorizontal: 4 }}>
        <Text style={styles.title}>{t('acc.relatives')} *</Text>
        <Text style={styles.sub}>{t('acc.relativesSub')}</Text>
      </View>
      {list.map((r, i) => (
        <View key={i} style={styles.card}>
          <View style={styles.head}>
            <MaterialCommunityIcons name={relativeValid(r) ? 'account-check' : 'account-outline'} size={20} color={relativeValid(r) ? colors.primary : colors.muted} />
            <Text style={styles.headText}>{t('acc.relativeN', { n: i + 1 })}</Text>
          </View>
          <Field label={t('acc.relName')} value={r.name} onChangeText={(v) => set(i, 'name', v)} placeholder="Асанова Гүлнара" />
          <Field label={t('acc.relWho')} value={r.relation} onChangeText={(v) => set(i, 'relation', v)} placeholder={t('acc.relWhoPh')} />
          <Field label={t('acc.relPhone')} value={r.phone} onChangeText={(v) => set(i, 'phone', v)} placeholder="+996 700 123 456" keyboardType="phone-pad" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '900', color: colors.text },
  sub: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  card: { backgroundColor: colors.card, borderRadius: 24, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headText: { fontSize: 15, fontWeight: '800', color: colors.text },
});
