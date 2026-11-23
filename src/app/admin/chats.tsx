import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../config/theme';
import { ChatThread, fetchThreads, fmtChatTime } from '../../lib/chat';

// Кардарлардын суроолору: ким жазды, окула элек канча
export default function AdminChats() {
  const [list, setList] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setList(await fetchThreads());
      setError(null);
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setError(m.includes('admin_chat_threads') ? 'SQL иштетиле элек (017).' : m);
    }
    setLoading(false);
  }, []);
  useFocusEffect(
    useCallback(() => {
      load();
      const id = setInterval(load, 8000);
      return () => clearInterval(id);
    }, [load]),
  );

  const unread = list.reduce((s, t) => s + t.unread, 0);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
        Кардарлар колдонмодон суроо жазат (выезддин баасы, товар барбы ж.б.). Жаңы билдирүү келгенде «Билдирмелерге» да түшөт.
        {unread > 0 ? `  Окула элек: ${unread}` : ''}
      </Text>
      {error && <Text style={{ color: colors.danger }}>{error}</Text>}
      {!loading && list.length === 0 && !error && <Text style={styles.empty}>Азырынча суроо жок</Text>}
      {list.map((t) => (
        <Pressable key={t.userId} style={[styles.card, t.unread > 0 && styles.unread]} onPress={() => router.push({ pathname: '/admin/chat/[userId]', params: { userId: t.userId } })}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="account" size={26} color={colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.name} numberOfLines={1}>
                {t.name !== '—' ? t.name : t.phone}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginLeft: 'auto' }}>{fmtChatTime(t.lastAt)}</Text>
            </View>
            {t.name !== '—' && <Text style={{ color: colors.muted, fontSize: 12 }}>{t.phone}</Text>}
            <Text style={{ color: t.unread ? colors.text : colors.muted, fontWeight: t.unread ? '700' : '400' }} numberOfLines={2}>
              {t.lastFromAdmin ? 'Сиз: ' : ''}
              {t.lastBody}
            </Text>
          </View>
          {t.unread > 0 && (
            <View style={styles.badge}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{t.unread}</Text>
            </View>
          )}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border },
  unread: { borderColor: colors.primary },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  name: { fontWeight: '800', fontSize: 15, color: colors.text, flexShrink: 1 },
  badge: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 24 },
});
