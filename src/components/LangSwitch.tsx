import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../config/theme';
import { LANGS, useT } from '../i18n';

// Тил тандоо: учурдагы тил (мисалы «КЫР ▾»), басканда тизме ачылат — тилдер көбөйсө да орун талашпайт
export function LangSwitch() {
  const { lang, setLang, t } = useT();
  const [open, setOpen] = useState(false);
  const current = LANGS.find((l) => l.id === lang) ?? LANGS[0];
  return (
    <View style={{ zIndex: 20 }}>
      <Pressable
        onPress={() => setOpen(!open)}
        style={styles.pill}
        accessibilityRole="button"
        accessibilityLabel={`${t('lang.label')}: ${current.name}`}
        accessibilityState={{ expanded: open }}
        hitSlop={6}
      >
        <MaterialCommunityIcons name="web" size={16} color={colors.primary} />
        <Text style={styles.pillText}>{current.short}</Text>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
      </Pressable>
      {open && (
        <View style={styles.menu} accessibilityRole="menu">
          {LANGS.map((l) => {
            const on = l.id === lang;
            return (
              <Pressable
                key={l.id}
                onPress={() => {
                  setLang(l.id);
                  setOpen(false);
                }}
                style={[styles.item, on && styles.itemOn]}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.itemText, on && { color: colors.primary }]}>{l.name}</Text>
                {on && <MaterialCommunityIcons name="check" size={16} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: colors.border },
  pillText: { fontSize: 12, fontWeight: '800', color: colors.text },
  menu: {
    position: 'absolute',
    top: 40,
    right: 0,
    minWidth: 150,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  itemOn: { backgroundColor: colors.primarySoft },
  itemText: { fontSize: 15, fontWeight: '600', color: colors.text },
});
