import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../config/theme';
import type { IconName } from '../data/products';
import type { AppNotification } from '../lib/notifications';

const ICON: Record<string, { icon: IconName; color: string }> = {
  reminder: { icon: 'alarm', color: '#D97706' },
  payment: { icon: 'cash-check', color: colors.success },
  rent: { icon: 'bicycle-electric', color: colors.primary },
  admin: { icon: 'bell-ring-outline', color: '#2563EB' },
  message: { icon: 'message-text-outline', color: '#7C3AED' },
  order: { icon: 'truck-fast', color: '#D97706' },
};

const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Билдирмелердин тизмеси (кардар жана админ үчүн бирдей)
export function NotificationList({ items }: { items: AppNotification[] }) {
  return (
    <View style={{ gap: 10 }}>
      {items.map((n) => {
        const ic = ICON[n.kind] ?? { icon: 'bell-outline' as IconName, color: colors.muted };
        return (
          <Pressable
            key={n.id}
            disabled={!n.link}
            onPress={() => n.link && router.push(n.link as never)}
            style={[styles.card, !n.read && styles.unread]}
          >
            <View style={[styles.icon, { backgroundColor: ic.color + '1A' }]}>
              <MaterialCommunityIcons name={ic.icon} size={22} color={ic.color} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.title}>{n.title}</Text>
              {!!n.body && <Text style={styles.body}>{n.body}</Text>}
              <Text style={styles.date}>{fmt(n.createdAt)}</Text>
            </View>
            {!n.read && <View style={styles.dot} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, backgroundColor: colors.card, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: colors.border },
  unread: { borderColor: colors.primary, backgroundColor: '#FBFEFB' },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: colors.text },
  body: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  date: { fontSize: 12, color: colors.muted, opacity: 0.8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 6 },
});
