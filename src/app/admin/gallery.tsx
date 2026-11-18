import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BeforeAfter } from '../../components/HomeSections';
import { Button, Card, Field } from '../../components/ui';
import { colors } from '../../config/theme';
import { useContent } from '../../context/ContentContext';
import { GalleryItem } from '../../data/content';
import { newId } from '../../lib/catalogApi';
import { pickAndUploadImage } from '../../lib/pickImage';

const empty = (): GalleryItem => ({ id: '', title: '' });

// «Чейин / кийин» сүрөттөрү: оңдоо барагында көрүнөт
export default function AdminGallery() {
  const { gallery, saveGalleryItem, deleteGalleryItem } = useContent();
  const [draft, setDraft] = useState<GalleryItem | null>(null);
  const [uploading, setUploading] = useState<'before' | 'after' | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async (which: 'before' | 'after') => {
    setError(null);
    setUploading(which);
    try {
      const url = await pickAndUploadImage([1, 1]);
      if (url) setDraft((d) => (d ? { ...d, [which === 'before' ? 'beforeUrl' : 'afterUrl']: url } : d));
    } catch (e) {
      setError('Сүрөт жүктөлгөн жок: ' + (e instanceof Error ? e.message : ''));
    }
    setUploading(null);
  };

  const save = async () => {
    if (!draft) return;
    setError(null);
    try {
      await saveGalleryItem({ ...draft, id: draft.id || newId('gal'), title: draft.title.trim() });
      setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ката кетти');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: colors.muted }}>
          Оңдоого чейинки жана кийинки сүрөттөр кардарлардын «Оңдоо» барагында көрүнөт. Бул ишенимди абдан көтөрөт.
        </Text>
        {error && <Text style={{ color: colors.danger }}>{error}</Text>}

        {draft ? (
          <Card style={{ gap: 12 }}>
            <Text style={styles.h}>{draft.id ? 'Өзгөртүү' : 'Жаңы иш'}</Text>
            <BeforeAfter title={draft.title || 'Иштин аталышы'} beforeUrl={draft.beforeUrl} afterUrl={draft.afterUrl} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                title={uploading === 'before' ? '…' : 'Чейин'}
                icon="image-plus"
                variant="outline"
                style={{ flex: 1 }}
                disabled={!!uploading}
                onPress={() => pick('before')}
              />
              <Button
                title={uploading === 'after' ? '…' : 'Кийин'}
                icon="image-plus"
                variant="outline"
                style={{ flex: 1 }}
                disabled={!!uploading}
                onPress={() => pick('after')}
              />
            </View>
            {uploading && <ActivityIndicator color={colors.primary} />}
            <Field label="Аталышы" value={draft.title} onChangeText={(t) => setDraft({ ...draft, title: t })} placeholder="Мисалы: 48V батарея калыбына келтирилди" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title="Жокко чыгаруу" variant="outline" style={{ flex: 1 }} onPress={() => setDraft(null)} />
              <Button
                title="Сактоо"
                icon="content-save"
                style={{ flex: 1 }}
                disabled={!draft.beforeUrl || !draft.afterUrl || !!uploading}
                onPress={save}
              />
            </View>
            {(!draft.beforeUrl || !draft.afterUrl) && <Text style={styles.hint}>Эки сүрөттү тең кошуңуз: «Чейин» жана «Кийин».</Text>}
          </Card>
        ) : (
          <Button title="Жаңы иш кошуу" icon="plus" onPress={() => setDraft(empty())} />
        )}

        {gallery.length === 0 && !draft && <Text style={styles.empty}>Азырынча сүрөт жок</Text>}

        {gallery.map((g) => (
          <View key={g.id} style={{ gap: 6 }}>
            <BeforeAfter title={g.title} beforeUrl={g.beforeUrl} afterUrl={g.afterUrl} />
            <View style={styles.actions}>
              <Pressable hitSlop={8} onPress={() => setDraft(g)} accessibilityLabel="Өзгөртүү">
                <MaterialCommunityIcons name="pencil" size={22} color={colors.primary} />
              </Pressable>
              {confirmId === g.id ? (
                <Pressable hitSlop={8} onPress={() => deleteGalleryItem(g.id).catch((e) => setError(String(e?.message ?? e)))}>
                  <Text style={{ color: colors.danger, fontWeight: '800' }}>Ооба, өчүр</Text>
                </Pressable>
              ) : (
                <Pressable hitSlop={8} onPress={() => setConfirmId(g.id)} accessibilityLabel="Өчүрүү">
                  <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.danger} />
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 16, fontWeight: '800', color: colors.text },
  hint: { color: colors.muted, fontSize: 13 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 18, paddingHorizontal: 4 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 24 },
});
