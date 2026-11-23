import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { colors, radius } from '../config/theme';

export type Bubble = { id: string; mine: boolean; text: string; time?: string; author?: string };

// Чат экраны: билдирүүлөр (өзүмдүкү оңдо) жана ылдыйда жазуу талаасы
export function ChatView({
  items,
  onSend,
  placeholder,
  initialText = '',
  header,
  empty,
  busy,
  error,
  maxLength = 2000,
}: {
  items: Bubble[];
  onSend: (text: string) => Promise<boolean>;
  placeholder: string;
  initialText?: string;
  header?: ReactNode;
  empty?: ReactNode;
  busy?: boolean;
  error?: string | null;
  maxLength?: number;
}) {
  const [text, setText] = useState(initialText);
  const [sending, setSending] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    if (initialText) setText(initialText);
  }, [initialText]);
  useEffect(() => {
    const id = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [items.length, busy]);

  const send = async () => {
    const v = text.trim();
    if (!v || sending) return;
    setSending(true);
    const ok = await onSend(v);
    setSending(false);
    if (ok) setText('');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {header}
        {items.length === 0 && !busy && empty}
        {items.map((b) => (
          <View key={b.id} style={[styles.bubble, b.mine ? styles.mine : styles.theirs]}>
            {!!b.author && <Text style={[styles.author, b.mine && { color: '#D1FAE5' }]}>{b.author}</Text>}
            <Text selectable style={[styles.text, b.mine && { color: '#fff' }]}>
              {b.text}
            </Text>
            {!!b.time && <Text style={[styles.time, b.mine && { color: '#D1FAE5' }]}>{b.time}</Text>}
          </View>
        ))}
        {busy && (
          <View style={[styles.bubble, styles.theirs, { flexDirection: 'row', gap: 8, alignItems: 'center' }]}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={{ color: colors.muted }}>…</Text>
          </View>
        )}
        {!!error && <Text style={{ color: colors.danger, textAlign: 'center', fontWeight: '600' }}>{error}</Text>}
      </ScrollView>
      <View style={styles.bar}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          multiline
          maxLength={maxLength}
          style={styles.input}
          onKeyPress={(e) => {
            // Вебде Enter — жөнөтүү, Shift+Enter — жаңы сап
            const ne = e.nativeEvent as { key: string; shiftKey?: boolean };
            if (Platform.OS === 'web' && ne.key === 'Enter' && !ne.shiftKey) {
              (e as unknown as { preventDefault?: () => void }).preventDefault?.();
              send();
            }
          }}
        />
        <Pressable onPress={send} disabled={!text.trim() || sending} style={[styles.send, (!text.trim() || sending) && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel="send">
          {sending ? <ActivityIndicator color="#fff" /> : <MaterialCommunityIcons name="send" size={22} color="#fff" />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '85%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 4 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 6 },
  author: { fontSize: 12, fontWeight: '800', color: colors.primary },
  text: { fontSize: 15, color: colors.text, lineHeight: 21 },
  time: { fontSize: 11, color: colors.muted, alignSelf: 'flex-end' },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
  input: { flex: 1, minHeight: 44, maxHeight: 140, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text, backgroundColor: colors.bg },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
