import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { colors, radius } from '../config/theme';
import type { IconName } from '../data/products';

export function Button({
  title,
  onPress,
  icon,
  variant = 'primary',
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'outline' | 'whatsapp';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const bg = variant === 'primary' ? colors.primary : variant === 'whatsapp' ? colors.whatsapp : 'transparent';
  const fg = variant === 'outline' ? colors.primary : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'outline' && { borderWidth: 1.5, borderColor: colors.primary },
        style,
      ]}
    >
      {icon && <MaterialCommunityIcons name={icon} size={20} color={fg} />}
      <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={[styles.input, props.multiline && { height: 90, textAlignVertical: 'top' }]} {...props} />
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.section}>{children}</Text>
      {right}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function QtyStepper({ value, onChange, min = 1 }: { value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <View style={styles.stepper}>
      <Pressable hitSlop={6} onPress={() => onChange(Math.max(min, value - 1))} style={styles.stepBtn}>
        <MaterialCommunityIcons name="minus" size={18} color={colors.text} />
      </Pressable>
      <Text style={styles.stepVal}>{value}</Text>
      <Pressable hitSlop={6} onPress={() => onChange(value + 1)} style={styles.stepBtn}>
        <MaterialCommunityIcons name="plus" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 18, borderRadius: radius.md },
  btnText: { fontSize: 16, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  section: { fontSize: 18, fontWeight: '800', color: colors.text },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.text },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: 10 },
  stepBtn: { padding: 8 },
  stepVal: { minWidth: 28, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.text },
});
