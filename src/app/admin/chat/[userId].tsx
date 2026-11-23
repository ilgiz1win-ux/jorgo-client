import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { ChatView } from '../../../components/ChatView';
import { Chip } from '../../../components/ui';
import { colors } from '../../../config/theme';
import { useContent } from '../../../context/ContentContext';
import { ChatMessage, ChatThread, fetchChat, fetchThreads, fmtChatTime, markChatRead, sendChat } from '../../../lib/chat';

// Админ: бир кардар менен сүйлөшүү
export default function AdminChat() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { masters } = useContent();
  const [list, setList] = useState<ChatMessage[]>([]);
  const [info, setInfo] = useState<ChatThread | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const l = await fetchChat(userId);
      setList(l);
      setError(null);
      if (l.some((m) => !m.fromAdmin && !m.readByAdmin)) markChatRead(userId, true).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ката кетти');
    }
    setLoaded(true);
  }, [userId]);
  useFocusEffect(
    useCallback(() => {
      load();
      fetchThreads()
        .then((ts) => setInfo(ts.find((t) => t.userId === userId) ?? null))
        .catch(() => {});
      const id = setInterval(load, 5000);
      return () => clearInterval(id);
    }, [load, userId]),
  );

  const send = async (text: string) => {
    try {
      const m = await sendChat(userId, text, true);
      setList((l) => [...l, m]);
      setDraft('');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ката кетти');
      return false;
    }
  };

  // Тез жооптор: мастерлердин выезд баалары
  const quick = [
    ...masters.filter((m) => m.active && m.outcall && m.outcallNote).map((m) => `🚗 Выезд (${m.name}): ${m.outcallNote}`),
    'Саламатсызбы! Азыр тактап, жазып берем.',
    'Ооба, бар. Келип көрсөңүз болот.',
  ];
  const title = info ? (info.name !== '—' ? info.name : info.phone) : 'Чат';
  return (
    <>
      <Stack.Screen options={{ title }} />
      <ChatView
        items={list.map((m) => ({ id: m.id, mine: m.fromAdmin, text: m.body, time: fmtChatTime(m.createdAt) + (m.fromAdmin ? (m.readByUser ? ' ✓✓' : ' ✓') : '') }))}
        onSend={send}
        placeholder="Жооп жазыңыз…"
        initialText={draft}
        busy={!loaded}
        error={error}
        header={
          <View style={{ gap: 8, marginBottom: 6 }}>
            {info && (
              <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
                <Pressable onPress={() => Linking.openURL(`tel:${info.phone.replace(/[^\d+]/g, '')}`)}>
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>📞 {info.phone}</Text>
                </Pressable>
                <Pressable onPress={() => router.push({ pathname: '/admin/customer/[id]', params: { id: userId } })}>
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>👤 Кардардын аккаунту</Text>
                </Pressable>
              </View>
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {quick.map((q) => (
                <Chip key={q} label={q.length > 48 ? q.slice(0, 46) + '…' : q} active={false} onPress={() => setDraft(q)} />
              ))}
            </ScrollView>
          </View>
        }
      />
    </>
  );
}
