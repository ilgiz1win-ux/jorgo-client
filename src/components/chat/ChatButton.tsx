import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../config/theme';
import { useChatUnread } from '../../hooks/useChatUnread';
import { useT } from '../../i18n';

// «Админ менен чат» — чоң баскыч (окула элек жооп болсо — кызыл белги)
export function ChatButton({ q, compact }: { q?: string; compact?: boolean }) {
  const { t } = useT();
  const unread = useChatUnread();
  return (
    <Pressable style={[styles.btn, compact && { paddingVertical: 10 }]} onPress={() => router.push({ pathname: '/chat', params: q ? { q } : {} })} accessibilityRole="button">
      <View style={styles.icon}>
        <MaterialCommunityIcons name="chat-processing" size={24} color="#fff" />
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{t('chat.admin')}</Text>
        {!compact && <Text style={styles.sub}>{unread > 0 ? t('chat.newReply', { n: unread }) : t('chat.adminSub')}</Text>}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color="#7C3AED" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F5F3FF', borderRadius: 18, padding: 14, borderWidth: 1.5, borderColor: '#7C3AED' },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: colors.text },
  sub: { fontSize: 13, color: colors.muted },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#fff' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
});
