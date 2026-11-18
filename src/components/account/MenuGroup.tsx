import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../config/theme';
import type { IconName } from '../../data/products';

// Скриншоттогудай топтолгон меню: тегерек бурчтуу ак карта, ичинде сызыктар менен бөлүнгөн саптар
export function MenuGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      {!!title && <Text style={styles.groupTitle}>{title.toUpperCase()}</Text>}
      <View style={styles.group}>{children}</View>
    </View>
  );
}

export function MenuRow({
  icon,
  label,
  sub,
  value,
  onPress,
  danger,
  right,
  first,
}: {
  icon: IconName;
  label: string;
  sub?: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: ReactNode;
  first?: boolean;
}) {
  const tint = danger ? colors.danger : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bg }]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={[styles.iconBox, { backgroundColor: danger ? '#FEE2E2' : colors.primarySoft }]}>
        <MaterialCommunityIcons name={icon} size={22} color={tint} />
      </View>
      <View style={[styles.body, !first && styles.divider]}>
        <View style={{ flex: 1, gap: 2 }}>
          {value !== undefined ? (
            <>
              <Text style={styles.sub}>{label}</Text>
              <Text style={styles.label}>{value || '—'}</Text>
            </>
          ) : (
            <>
              <Text style={[styles.label, danger && { color: colors.danger }]}>{label}</Text>
              {!!sub && <Text style={styles.sub}>{sub}</Text>}
            </>
          )}
        </View>
        {right ?? (onPress ? <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} /> : null)}
      </View>
    </Pressable>
  );
}

export function Avatar({ name, size = 56, light }: { name: string; size?: number; light?: boolean }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?';
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: light ? '#fff' : colors.primarySoft }]}>
      <Text style={{ fontSize: size * 0.36, fontWeight: '900', color: colors.primaryDark }}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  groupTitle: { fontSize: 12, fontWeight: '800', color: colors.muted, letterSpacing: 1, marginLeft: 4 },
  group: { backgroundColor: colors.card, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 14, gap: 14 },
  iconBox: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingRight: 14, gap: 8 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  label: { fontSize: 16, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.muted },
  avatar: { alignItems: 'center', justifyContent: 'center' },
});
