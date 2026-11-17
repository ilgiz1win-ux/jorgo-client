import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { PromoBanner } from '../../components/PromoBanner';
import { Button, Card, Field } from '../../components/ui';
import { colors } from '../../config/theme';
import { useCatalog } from '../../context/CatalogContext';
import { Promo, PROMO_COLORS } from '../../data/products';
import { newId } from '../../lib/catalogApi';
import { pickAndUploadImage } from '../../lib/pickImage';

const empty = (): Promo => ({ id: '', title: '', text: '', color: PROMO_COLORS[0], active: true });

export default function Promos() {
  const { promos, savePromo, deletePromo } = useCatalog();
  const [draft, setDraft] = useState<Promo | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    if (!draft) return;
    setError(null);
    setUploading(true);
    try {
      const url = await pickAndUploadImage([16, 9]);
      if (url) setDraft((d) => (d ? { ...d, imageUrl: url } : d));
    } catch (e) {
      setError('Сүрөт жүктөлгөн жок: ' + (e instanceof Error ? e.message : ''));
    }
    setUploading(false);
  };

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

  const saveDraft = async () => {
    if (!draft) return;
    const p = { ...draft, id: draft.id || newId('promo'), title: draft.title.trim(), text: draft.text.trim() };
    if (await run(() => savePromo(p))) setDraft(null);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: colors.muted }}>
          Активдүү акциялар кардарлардын колдонмосунда башкы беттин жогору жагында баннер болуп көрүнөт. Товардын баасын арзандатуу үчүн товардын барагында «Эски баасы» талаасын толтуруңуз.
        </Text>

        {error && <Text style={{ color: colors.danger }}>{error}</Text>}

        {draft ? (
          <Card style={{ gap: 14 }}>
            <Text style={styles.h}>{draft.id ? 'Акцияны өзгөртүү' : 'Жаңы акция'}</Text>
            <PromoBanner promo={{ ...draft, title: draft.title || 'Акциянын аталышы', text: draft.text || 'Кыскача сүрөттөмө' }} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                title={uploading ? 'Жүктөлүүдө…' : draft.imageUrl ? 'Сүрөттү алмаштыруу' : 'Сүрөт кошуу'}
                icon="image-plus"
                variant="outline"
                style={{ flex: 1 }}
                disabled={uploading}
                onPress={pickImage}
              />
              {draft.imageUrl && !uploading && (
                <Button title="Алып салуу" variant="outline" onPress={() => setDraft({ ...draft, imageUrl: undefined })} />
              )}
            </View>
            {uploading && <ActivityIndicator color={colors.primary} />}
            <Text style={styles.hint}>Сүрөт туурасынан (16:9) кесилет. Сүрөт жок болсо, тандалган түс колдонулат.</Text>
            <Field label="Аталышы *" value={draft.title} onChangeText={(t) => setDraft({ ...draft, title: t })} placeholder="Мисалы: Батареяларга −15%" />
            <Field label="Сүрөттөмө" value={draft.text} onChangeText={(t) => setDraft({ ...draft, text: t })} placeholder="Мисалы: 30-ноябрга чейин" />
            <View style={{ gap: 6 }}>
              <Text style={styles.label}>Түсү (сүрөт жок болсо фон, болсо «Акция» белгиси)</Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {PROMO_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setDraft({ ...draft, color: c })}
                    style={[styles.swatch, { backgroundColor: c }, draft.color === c && styles.swatchOn]}
                    accessibilityLabel={`Түс ${c}`}
                  >
                    {draft.color === c && <MaterialCommunityIcons name="check" size={18} color="#fff" />}
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title="Жокко чыгаруу" variant="outline" style={{ flex: 1 }} onPress={() => setDraft(null)} />
              <Button title="Сактоо" icon="content-save" style={{ flex: 1 }} disabled={draft.title.trim().length < 2 || uploading} onPress={saveDraft} />
            </View>
          </Card>
        ) : (
          <Button title="Жаңы акция кошуу" icon="plus" onPress={() => setDraft(empty())} />
        )}

        {promos.length === 0 && !draft && <Text style={{ color: colors.muted, textAlign: 'center', paddingVertical: 24 }}>Азырынча акция жок</Text>}

        {promos.map((p) => (
          <Card key={p.id} style={{ gap: 10, opacity: p.active ? 1 : 0.6 }}>
            <PromoBanner promo={p} />
            <View style={styles.actions}>
              <Switch value={p.active} onValueChange={(v) => { run(() => savePromo({ ...p, active: v })); }} trackColor={{ true: colors.primary, false: colors.border }} />
              <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>{p.active ? 'Көрсөтүлүүдө' : 'Өчүк'}</Text>
              <Pressable hitSlop={8} onPress={() => setDraft(p)} accessibilityLabel="Өзгөртүү">
                <MaterialCommunityIcons name="pencil" size={22} color={colors.primary} />
              </Pressable>
              {confirmId === p.id ? (
                <Pressable hitSlop={8} onPress={() => run(() => deletePromo(p.id))}>
                  <Text style={{ color: colors.danger, fontWeight: '800' }}>Өчүрөмүнбү? Ооба</Text>
                </Pressable>
              ) : (
                <Pressable hitSlop={8} onPress={() => setConfirmId(p.id)} accessibilityLabel="Өчүрүү">
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
  hint: { color: colors.muted, fontSize: 13 },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  swatchOn: { borderWidth: 3, borderColor: colors.text },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
});
