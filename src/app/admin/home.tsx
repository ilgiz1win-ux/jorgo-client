import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HeroBanner, StatsRow } from '../../components/HomeSections';
import { Button, Card, Field } from '../../components/ui';
import { colors } from '../../config/theme';
import { useContent } from '../../context/ContentContext';
import { SiteSettings } from '../../data/content';
import { pickAndUploadImage } from '../../lib/pickImage';

// Башкы беттин чоң баннери жана сандар блогу
export default function AdminHomeContent() {
  const { settings, saveSettings } = useContent();
  const [draft, setDraft] = useState<SiteSettings>(settings);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Серверден жөндөөлөр кийинчерээк келсе, формага коёбуз
  useEffect(() => setDraft(settings), [settings]);

  const pick = async () => {
    setMsg(null);
    setUploading(true);
    try {
      const url = await pickAndUploadImage([16, 9]);
      if (url) setDraft((d) => ({ ...d, heroImageUrl: url }));
    } catch (e) {
      setMsg({ ok: false, text: 'Сүрөт жүктөлгөн жок: ' + (e instanceof Error ? e.message : '') });
    }
    setUploading(false);
  };

  const setStat = (i: number, key: 'value' | 'label', v: string) =>
    setDraft((d) => ({ ...d, stats: d.stats.map((s, j) => (j === i ? { ...s, [key]: v } : s)) }));

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await saveSettings({ ...draft, heroTitle: draft.heroTitle.trim(), heroText: draft.heroText.trim() });
      setMsg({ ok: true, text: 'Сакталды. Кардарлар башкы бетте көрөт.' });
    } catch (e) {
      setMsg({ ok: false, text: 'Сакталган жок: ' + (e instanceof Error ? e.message : '') });
    }
    setSaving(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.h}>Чоң баннер</Text>
        <HeroBanner settings={draft} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button
            title={uploading ? 'Жүктөлүүдө…' : draft.heroImageUrl ? 'Сүрөттү алмаштыруу' : 'Сүрөт кошуу'}
            icon="image-plus"
            variant="outline"
            style={{ flex: 1 }}
            disabled={uploading}
            onPress={pick}
          />
          {draft.heroImageUrl && !uploading && (
            <Button title="Алып салуу" variant="outline" onPress={() => setDraft({ ...draft, heroImageUrl: undefined })} />
          )}
        </View>
        {uploading && <ActivityIndicator color={colors.primary} />}
        <Text style={styles.hint}>Дүкөндүн, устакананын же велосипеддердин жакшы сүрөтүн коюңуз. Сүрөт жок болсо, логотиптеги велосипед көрүнөт.</Text>
        <Card style={{ gap: 12 }}>
          <Field label="Аталышы" value={draft.heroTitle} onChangeText={(t) => setDraft({ ...draft, heroTitle: t })} />
          <Field label="Кыскача текст" value={draft.heroText} onChangeText={(t) => setDraft({ ...draft, heroText: t })} multiline />
        </Card>

        <Text style={[styles.h, { marginTop: 8 }]}>Сандар</Text>
        <StatsRow stats={draft.stats} />
        <Card style={{ gap: 10 }}>
          {draft.stats.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ width: 100 }}>
                <Field label={`${i + 1}. Сан`} value={s.value} onChangeText={(t) => setStat(i, 'value', t)} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Түшүндүрмө" value={s.label} onChangeText={(t) => setStat(i, 'label', t)} />
              </View>
            </View>
          ))}
        </Card>

        {msg && <Text style={{ color: msg.ok ? colors.success : colors.danger, fontWeight: '600' }}>{msg.text}</Text>}
        <Button title={saving ? 'Сакталууда…' : 'Сактоо'} icon="content-save" onPress={save} disabled={saving || uploading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 17, fontWeight: '800', color: colors.text },
  hint: { color: colors.muted, fontSize: 13 },
});
