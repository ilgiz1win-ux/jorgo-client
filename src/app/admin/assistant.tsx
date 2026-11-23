import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChatView } from '../../components/ChatView';
import { Chip } from '../../components/ui';
import { colors } from '../../config/theme';
import { AiMsg, askAssistant } from '../../lib/assistant';

const KEY = 'jorgo.admin.ai';
const QUICK = [
  'Бүгүн жана ушул жумада канча заказ түштү?',
  'Кайсы ижарачылар төлөмдү кечиктирди?',
  'Мастерлердин ичинен ким көп иштеди?',
  'Жооп күтүп жаткан кардарлар барбы?',
  'Акцияга текст жазып бер',
];

// Админ панелдин ИИ жардамчысы
export default function AdminAssistant() {
  const [list, setList] = useState<AiMsg[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => v && setList(JSON.parse(v) as AiMsg[]))
      .catch(() => {});
  }, []);
  const save = (l: AiMsg[]) => AsyncStorage.setItem(KEY, JSON.stringify(l.slice(-40))).catch(() => {});

  const send = async (text: string) => {
    const next: AiMsg[] = [...list, { role: 'user', content: text }];
    setList(next);
    setDraft('');
    setError(null);
    setBusy(true);
    try {
      const reply = await askAssistant(next.slice(-20));
      const done: AiMsg[] = [...next, { role: 'assistant', content: reply }];
      setList(done);
      save(done);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ката кетти');
      save(next);
    }
    setBusy(false);
    return true;
  };

  return (
    <ChatView
      items={list.map((m, i) => ({ id: String(i), mine: m.role === 'user', text: m.content, author: m.role === 'assistant' ? '🤖 ИИ жардамчы' : undefined }))}
      onSend={send}
      placeholder="Суроо жазыңыз…"
      initialText={draft}
      busy={busy}
      error={error}
      maxLength={4000}
      header={
        <View style={{ gap: 8, marginBottom: 6 }}>
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
            Жардамчы заказдарды, оңдоону, мастерлерди, ижараларды, товарларды жана кардарлардын суроолорун көрүп жооп берет, текст жазып берет. Ал эч нерсени өзгөртпөйт.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {QUICK.map((q) => (
              <Chip key={q} label={q} active={false} onPress={() => setDraft(q)} />
            ))}
          </View>
          {list.length > 0 && (
            <Pressable
              onPress={() => {
                setList([]);
                setError(null);
                AsyncStorage.removeItem(KEY).catch(() => {});
              }}
              style={{ alignSelf: 'flex-end' }}
            >
              <Text style={{ color: colors.danger, fontWeight: '700' }}>🗑 Сүйлөшүүнү тазалоо</Text>
            </Pressable>
          )}
        </View>
      }
    />
  );
}
