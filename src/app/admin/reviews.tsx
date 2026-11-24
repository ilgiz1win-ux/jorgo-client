import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { decideReview, fetchSubmissions, ReviewSubmission } from '../../lib/reviewSubmissions';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stars } from '../../components/HomeSections';
import { Button, Card, Field } from '../../components/ui';
import { colors } from '../../config/theme';
import { useContent } from '../../context/ContentContext';
import { Review } from '../../data/content';
import { newId } from '../../lib/catalogApi';

const empty = (): Review => ({ id: '', name: '', text: '', rating: 5 });
const ABOUT: Record<ReviewSubmission['about'], string> = { shop: 'Дүкөн', repair: 'Оңдоо / выезд', rental: 'Ижара', product: 'Товар', master: 'Мастер' };

// Кардарлар жазган пикирлер: ырастаса башкы бетке чыгат
function Pending() {
  const { saveReview, refreshContent } = useContent();
  const [list, setList] = useState<ReviewSubmission[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const load = () =>
    fetchSubmissions()
      .then(setList)
      .catch((e) => setErr(e instanceof Error && e.message.includes('review_submissions') ? 'SQL иштетиле элек (030).' : null));
  useEffect(() => {
    load();
  }, []);
  const decide = async (id: string, ok: boolean) => {
    try {
      await decideReview(id, ok, (r) => saveReview(r));
      await refreshContent();
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ката кетти');
    }
  };
  const pending = list.filter((r) => r.status === 'new');
  return (
    <Card style={{ gap: 10, borderColor: '#CA8A04', borderWidth: 1.5 }}>
      <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>⭐ Кардарлардын жаңы пикирлери ({pending.length})</Text>
      {err && <Text style={{ color: colors.danger }}>{err}</Text>}
      {pending.length === 0 && <Text style={{ color: colors.muted }}>Жаңы пикир жок</Text>}
      {pending.map((r) => (
        <View key={r.id} style={{ gap: 4, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontWeight: '800', color: colors.text, flex: 1 }}>{r.name}</Text>
            <Stars rating={r.rating} />
          </View>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {ABOUT[r.about]}
            {r.refTitle ? ` · ${r.refTitle}` : ''} · {new Date(r.createdAt).toLocaleDateString('ru-RU')}
          </Text>
          <Text style={{ color: colors.text }}>{r.text}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Башкы бетке чыгаруу" icon="check" style={{ flex: 1 }} onPress={() => decide(r.id, true)} />
            <Button title="Жашыруу" variant="outline" style={{ flex: 1 }} onPress={() => decide(r.id, false)} />
          </View>
        </View>
      ))}
    </Card>
  );
}

// Кардарлардын чыныгы пикирлерин кошуу (мисалы Instagram комментарийлеринен)
export default function AdminReviews() {
  const { reviews, saveReview, deleteReview } = useContent();
  const [draft, setDraft] = useState<Review | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ката кетти');
      return false;
    }
  };

  const save = async () => {
    if (!draft) return;
    const r = { ...draft, id: draft.id || newId('rev'), name: draft.name.trim(), text: draft.text.trim() };
    if (await run(() => saveReview(r))) setDraft(null);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Pending />
        <Text style={{ color: colors.muted }}>
          Пикирлер башкы бетте көрүнөт. Кардарлардын чыныгы сөздөрүн гана жазыңыз (мисалы Instagram же WhatsApp'тагы жакшы пикирлер). Пикир жок болсо, бул бөлүм көрүнбөйт.
        </Text>
        {error && <Text style={{ color: colors.danger }}>{error}</Text>}

        {draft ? (
          <Card style={{ gap: 12 }}>
            <Text style={styles.h}>{draft.id ? 'Пикирди өзгөртүү' : 'Жаңы пикир'}</Text>
            <Field label="Кардардын аты *" value={draft.name} onChangeText={(t) => setDraft({ ...draft, name: t })} placeholder="Мисалы: Бакыт" />
            <Field label="Пикир *" value={draft.text} onChangeText={(t) => setDraft({ ...draft, text: t })} multiline />
            <View style={{ gap: 6 }}>
              <Text style={styles.label}>Баа</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} onPress={() => setDraft({ ...draft, rating: n })} hitSlop={4} accessibilityLabel={`${n} жылдыз`}>
                    <MaterialCommunityIcons name={n <= draft.rating ? 'star' : 'star-outline'} size={32} color="#F59E0B" />
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title="Жокко чыгаруу" variant="outline" style={{ flex: 1 }} onPress={() => setDraft(null)} />
              <Button
                title="Сактоо"
                icon="content-save"
                style={{ flex: 1 }}
                disabled={draft.name.trim().length < 2 || draft.text.trim().length < 3}
                onPress={save}
              />
            </View>
          </Card>
        ) : (
          <Button title="Пикир кошуу" icon="plus" onPress={() => setDraft(empty())} />
        )}

        {reviews.length === 0 && !draft && <Text style={styles.empty}>Азырынча пикир жок</Text>}

        {reviews.map((r) => (
          <Card key={r.id} style={{ gap: 6 }}>
            <View style={styles.row}>
              <Text style={styles.name}>{r.name}</Text>
              <Stars rating={r.rating} />
            </View>
            <Text style={{ color: colors.text }}>{r.text}</Text>
            <View style={[styles.row, { justifyContent: 'flex-end', gap: 18 }]}>
              <Pressable hitSlop={8} onPress={() => setDraft(r)} accessibilityLabel="Өзгөртүү">
                <MaterialCommunityIcons name="pencil" size={22} color={colors.primary} />
              </Pressable>
              {confirmId === r.id ? (
                <Pressable hitSlop={8} onPress={() => run(() => deleteReview(r.id))}>
                  <Text style={{ color: colors.danger, fontWeight: '800' }}>Ооба, өчүр</Text>
                </Pressable>
              ) : (
                <Pressable hitSlop={8} onPress={() => setConfirmId(r.id)} accessibilityLabel="Өчүрүү">
                  <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.danger} />
                </Pressable>
              )}
            </View>
          </Card>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 16, fontWeight: '800', color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontWeight: '800', color: colors.text, fontSize: 15 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 24 },
});
