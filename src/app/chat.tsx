import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { RequireAccount } from '../components/account/RequireAccount';
import { ChatView } from '../components/ChatView';
import { Chip } from '../components/ui';
import { colors } from '../config/theme';
import { useAccount } from '../context/AccountContext';
import { useT } from '../i18n';
import { ChatMessage, fetchChat, fmtChatTime, markChatRead, sendChat } from '../lib/chat';

// Кардардын админ менен чаты: суроолор (выезддин баасы ж.б.)
function CustomerChat() {
  const { t } = useT();
  const { profile } = useAccount();
  const params = useLocalSearchParams<{ q?: string }>();
  const [list, setList] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(params.q ?? '');
  const userId = profile?.id ?? '';

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const l = await fetchChat(userId);
      setList(l);
      setError(null);
      if (l.some((m) => m.fromAdmin && !m.readByUser)) markChatRead(userId, false).catch(() => {});
    } catch (e) {
      const m = e instanceof Error ? e.message : '';
      setError(m.includes('chat_messages') ? t('chat.notReady') : t('chat.error'));
    }
    setLoaded(true);
  }, [userId, t]);

  // Экран ачык турганда ар 6 секундда жаңы жоопторду текшерет
  useFocusEffect(
    useCallback(() => {
      load();
      const id = setInterval(load, 6000);
      return () => clearInterval(id);
    }, [load]),
  );

  const send = async (text: string) => {
    try {
      const m = await sendChat(userId, text);
      setList((l) => [...l, m]);
      setDraft('');
      setError(null);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setError(/row-level security|42501/i.test(msg) ? t('checkout.blocked') : t('chat.error'));
      return false;
    }
  };

  const quick = [t('chat.q.outcall'), t('chat.q.stock'), t('chat.q.repairTime')];
  return (
    <ChatView
      items={list.map((m) => ({ id: m.id, mine: !m.fromAdmin, text: m.body, time: fmtChatTime(m.createdAt), author: m.fromAdmin ? 'Jorgo Eco Service' : undefined }))}
      onSend={send}
      placeholder={t('chat.placeholder')}
      initialText={draft}
      busy={!loaded}
      error={error}
      header={
        <View style={{ gap: 8, marginBottom: 6 }}>
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{t('chat.intro')}</Text>
          {list.length === 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {quick.map((q) => (
                <Chip key={q} label={q} active={false} onPress={() => setDraft(q)} />
              ))}
            </View>
          )}
        </View>
      }
    />
  );
}

export default function ChatScreen() {
  return (
    <RequireAccount next="/chat">
      <CustomerChat />
    </RequireAccount>
  );
}
