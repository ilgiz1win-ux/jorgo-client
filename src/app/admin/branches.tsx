import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field } from '../../components/ui';
import { colors } from '../../config/theme';
import { useContent } from '../../context/ContentContext';
import type { Branch } from '../../data/content';
import { normalizeWhatsapp } from '../../lib/contentApi';

// Точкалар: аты (дареги) жана өз WhatsApp номери. Кардардын заказы тандаган точкасынын номерине кетет.
export default function AdminBranches() {
  const { branches, saveBranches } = useContent();
  const [list, setList] = useState<Branch[]>(branches);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setList(branches), [branches]);

  const set = (i: number, k: keyof Branch, v: string) => setList((l) => l.map((b, j) => (j === i ? { ...b, [k]: v } : b)));
  const valid = list.length > 0 && list.every((b) => b.name.trim().length > 2 && /^996\d{9}$/.test(normalizeWhatsapp(b.whatsapp)));

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await saveBranches(list);
      setMsg({ ok: true, text: 'Сакталды. Эми заказдар ар бир точканын өз номерине кетет.' });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Ката кетти' });
    }
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>
          Кардар заказ берүүдө же оңдоого жазылууда точканы тандайт. Өтүнмө ошол точканын WhatsApp номерине кетет. Канча заказ кайсы точкага түшкөнүн «Статистика» бөлүмүнөн көрөсүз.
        </Text>
        {list.map((b, i) => (
          <Card key={i} style={{ gap: 10 }}>
            <View style={styles.head}>
              <MaterialCommunityIcons name="store-marker" size={22} color={colors.primary} />
              <Text style={styles.h}>{i + 1}-точка</Text>
              {list.length > 1 && (
                <Pressable onPress={() => setList((l) => l.filter((_, j) => j !== i))} hitSlop={8} accessibilityLabel="Өчүрүү">
                  <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.danger} />
                </Pressable>
              )}
            </View>
            <Field label="Дареги / аты" value={b.name} onChangeText={(v) => set(i, 'name', v)} placeholder="Мисалы: Фучика көч., 62а" />
            <Field label="WhatsApp номери" value={b.whatsapp} onChangeText={(v) => set(i, 'whatsapp', v)} placeholder="0700 123 456" keyboardType="phone-pad" />
            {!!b.whatsapp && !/^996\d{9}$/.test(normalizeWhatsapp(b.whatsapp)) && <Text style={{ color: colors.danger, fontSize: 12 }}>Номерди туура жазыңыз: 0700 123 456</Text>}
          </Card>
        ))}
        <Button title="Точка кошуу" icon="plus" variant="outline" onPress={() => setList((l) => [...l, { name: '', whatsapp: '' }])} />
        <Button title={busy ? 'Сакталууда…' : 'Сактоо'} icon="content-save" disabled={!valid || busy} onPress={save} />
        {msg && <Text style={{ color: msg.ok ? colors.success : colors.danger }}>{msg.text}</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  h: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
});
