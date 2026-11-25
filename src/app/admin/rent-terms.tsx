import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card } from '../../components/ui';
import { colors, radius } from '../../config/theme';
import { useContent } from '../../context/ContentContext';
import { useRentRules } from '../../hooks/useRentRules';

// Админ: ижаранын шарттары. Кардар «Аренда → Шарттар» барагында жана ижарага каттоодо көрөт.
export default function AdminRentTerms() {
  const { rentTerms, saveRentTerms } = useContent();
  const { rules, custom } = useRentRules();
  const [text, setText] = useState(rentTerms.text);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setText(rentTerms.text), [rentTerms.text]);

  const preview = text
    .split('\n')
    .map((l) => l.replace(/^[•\-*\s]+/, '').trim())
    .filter(Boolean);
  const changed = text.trim() !== rentTerms.text.trim();

  const save = async (value: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await saveRentTerms({ text: value.trim() });
      setMsg({ ok: true, text: value.trim() ? 'Сакталды ✅ Кардарлар дароо көрөт.' : 'Даяр шарттар кайтарылды ✅' });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Ката кетти' });
    }
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={styles.info}>
          <MaterialCommunityIcons name="information-outline" size={20} color="#1D4ED8" />
          <Text style={{ flex: 1, color: '#1E3A8A', lineHeight: 20 }}>
            Ар бир шартты жаңы саптан жазыңыз. Кардар аларды «Аренда → Шарттар» барагында жана велосипедди ижарага алып жатканда (макулдук белгисинин үстүндө) көрөт.
            {!custom ? ' Азыр даяр шарттар көрүнүп турат — аларды жүктөп, өзгөртсөңүз болот.' : ''}
          </Text>
        </View>

        <Card style={{ gap: 10 }}>
          <Text style={styles.h}>Шарттар</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            placeholder={'Минимум 7 күн\nКүрөө: 5000 сом\nЗаряддагыч менен берилет'}
            placeholderTextColor={colors.muted}
            style={styles.input}
            textAlignVertical="top"
          />
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {!text.trim() && <Button title="Даяр шарттарды жүктөө" variant="outline" icon="text-box-plus-outline" onPress={() => setText(rules.join('\n'))} style={{ flex: 1 }} />}
            <Button title={busy ? '…' : 'Сактоо'} icon="content-save" disabled={busy || !changed} onPress={() => save(text)} style={{ flex: 1 }} />
          </View>
          {custom && (
            <Button
              title="Даяр шарттарга кайтаруу"
              variant="outline"
              icon="restore"
              disabled={busy}
              onPress={() => {
                setText('');
                save('');
              }}
            />
          )}
          {msg && <Text style={{ color: msg.ok ? colors.success : colors.danger, fontWeight: '700' }}>{msg.text}</Text>}
        </Card>

        <Card style={{ gap: 8, backgroundColor: '#FFFBEB', borderColor: '#F59E0B' }}>
          <Text style={[styles.h, { color: '#92400E' }]}>Кардар ушундай көрөт</Text>
          {(preview.length ? preview : rules).map((r, i) => (
            <Text key={i} style={{ color: '#78350F', lineHeight: 20 }}>
              • {r}
            </Text>
          ))}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 16, fontWeight: '800', color: colors.text },
  info: { flexDirection: 'row', gap: 8, backgroundColor: '#EFF6FF', borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  input: { minHeight: 240, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, fontSize: 15, lineHeight: 22, color: colors.text, backgroundColor: colors.card },
});
