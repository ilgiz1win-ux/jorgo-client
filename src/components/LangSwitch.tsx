import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../config/theme';
import { LANGS, useT } from '../i18n';

// Тил тандоо: КЫР | РУС
export function LangSwitch() {
  const { lang, setLang, t } = useT();
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel={t('lang.label')}>
      {LANGS.map((l) => {
        const on = l.id === lang;
        return (
          <Pressable
            key={l.id}
            onPress={() => setLang(l.id)}
            style={[styles.opt, on && styles.on]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={l.name}
            hitSlop={4}
          >
            <Text style={[styles.text, on && styles.textOn]}>{l.short}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 999, padding: 3, borderWidth: 1, borderColor: colors.border },
  opt: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  on: { backgroundColor: colors.primary },
  text: { fontSize: 12, fontWeight: '800', color: colors.muted },
  textOn: { color: '#fff' },
});
