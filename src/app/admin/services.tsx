import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field } from '../../components/ui';
import { colors, radius } from '../../config/theme';
import { useCatalog } from '../../context/CatalogContext';
import { RepairService, SERVICE_ICONS } from '../../data/services';
import { newId } from '../../lib/catalogApi';

const empty = (): RepairService => ({ id: '', title: '', price: '', icon: 'wrench' });

export default function AdminServices() {
  const { services, saveService, deleteService } = useCatalog();
  const [draft, setDraft] = useState<RepairService | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    const sv = { ...draft, id: draft.id || newId('svc'), title: draft.title.trim(), price: draft.price.trim() };
    if (await run(() => saveService(sv))) setDraft(null);
    setSaving(false);
  };

  const editor = draft && (
    <Card style={{ gap: 14 }}>
      <Text style={styles.h}>{draft.id ? 'Кызматты өзгөртүү' : 'Жаңы кызмат'}</Text>
      <Field label="Аталышы *" value={draft.title} onChangeText={(t) => setDraft({ ...draft, title: t })} placeholder="Мисалы: Батареяны оңдоо" />
      <Field label="Баасы *" value={draft.price} onChangeText={(t) => setDraft({ ...draft, price: t })} placeholder="Мисалы: 1500 сом же 1500 сомдон" />
      <View style={{ gap: 6 }}>
        <Text style={styles.label}>Иконка</Text>
        <View style={styles.icons}>
          {SERVICE_ICONS.map((ic) => (
            <Pressable
              key={ic}
              onPress={() => setDraft({ ...draft, icon: ic })}
              style={[styles.iconBtn, draft.icon === ic && styles.iconOn]}
              accessibilityLabel={ic}
            >
              <MaterialCommunityIcons name={ic} size={22} color={draft.icon === ic ? '#fff' : colors.primary} />
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Жокко чыгаруу" variant="outline" style={{ flex: 1 }} onPress={() => setDraft(null)} />
        <Button
          title={saving ? 'Сакталууда…' : 'Сактоо'}
          icon="content-save"
          style={{ flex: 1 }}
          disabled={draft.title.trim().length < 2 || !draft.price.trim() || saving}
          onPress={saveDraft}
        />
      </View>
    </Card>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: colors.muted }}>
          Бул кызматтар жана баалар кардарлардын колдонмосундагы «Оңдоо» барагында көрүнөт.
        </Text>

        {error && <Text style={{ color: colors.danger }}>{error}</Text>}

        {draft && !draft.id ? editor : !draft && <Button title="Жаңы кызмат кошуу" icon="plus" onPress={() => setDraft(empty())} />}

        {services.length === 0 && !draft && <Text style={styles.empty}>Азырынча кызмат жок</Text>}

        {services.map((s) =>
          draft?.id === s.id ? (
            <View key={s.id}>{editor}</View>
          ) : (
            <Card key={s.id} style={styles.row}>
              <View style={styles.rowIcon}>
                <MaterialCommunityIcons name={s.icon} size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{s.title}</Text>
                <Text style={styles.price}>{s.price}</Text>
              </View>
              <Pressable hitSlop={8} onPress={() => setDraft(s)} accessibilityLabel="Өзгөртүү">
                <MaterialCommunityIcons name="pencil" size={22} color={colors.primary} />
              </Pressable>
              {confirmId === s.id ? (
                <Pressable hitSlop={8} onPress={() => run(() => deleteService(s.id))}>
                  <Text style={{ color: colors.danger, fontWeight: '800' }}>Ооба, өчүр</Text>
                </Pressable>
              ) : (
                <Pressable hitSlop={8} onPress={() => setConfirmId(s.id)} accessibilityLabel="Өчүрүү">
                  <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.danger} />
                </Pressable>
              )}
            </Card>
          ),
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 16, fontWeight: '800', color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  iconOn: { backgroundColor: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  rowIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  price: { fontSize: 14, fontWeight: '800', color: colors.primary, marginTop: 2 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 24 },
});
