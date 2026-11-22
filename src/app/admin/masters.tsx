import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button, Card, Chip, Field } from '../../components/ui';
import { colors, radius } from '../../config/theme';
import { useContent } from '../../context/ContentContext';
import type { Master } from '../../data/content';
import { newId } from '../../lib/catalogApi';
import { pickAndUploadImage } from '../../lib/pickImage';

const empty = (): Master => ({
  id: '',
  name: '',
  specialty: '',
  experience: '',
  branch: '',
  active: true,
  rating: 5,
  orders: 0,
  hoursFrom: '09:00',
  hoursTo: '18:00',
  outcall: false,
  outcallNote: '',
});

// "9" → "09:00", "930" → "09:30"
const fixTime = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  if (!d) return '';
  const h = d.length <= 2 ? d : d.slice(0, d.length - 2);
  const m = d.length <= 2 ? '00' : d.slice(-2);
  return `${h.padStart(2, '0')}:${m}`;
};

// Оңдоо мастерлери: сүрөтү, аты, адистиги, тажрыйбасы, филиалы
export default function AdminMasters() {
  const { masters, saveMaster, deleteMaster, branches } = useContent();
  const [draft, setDraftRaw] = useState<Master | null>(null);
  const [ratingText, setRatingText] = useState('5');
  const [ordersText, setOrdersText] = useState('0');
  const setDraft = (m: Master | null) => {
    // Сан талааларын жаңы мастер ачылганда гана толтурабыз (терип жатканда өчүрбөйт)
    const opening = m && (!draft || m.id !== draft.id);
    setDraftRaw(m);
    if (m && opening) {
      setRatingText(String(m.rating));
      setOrdersText(String(m.orders));
    }
  };
  const [uploading, setUploading] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
      return true;
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Ката кетти';
      setError(m.includes('masters') ? 'SQL иштетиле элек (011_masters.sql).' : m);
      return false;
    }
  };

  const pick = async () => {
    setUploading(true);
    setError(null);
    try {
      const url = await pickAndUploadImage([1, 1]);
      if (url) setDraftRaw((d) => (d ? { ...d, photoUrl: url } : d));
    } catch (e) {
      setError('Сүрөт жүктөлгөн жок: ' + (e instanceof Error ? e.message : ''));
    }
    setUploading(false);
  };

  const save = async () => {
    if (!draft) return;
    const m: Master = {
      ...draft,
      id: draft.id || newId('master'),
      name: draft.name.trim(),
      specialty: draft.specialty.trim(),
      experience: draft.experience.trim(),
      branch: draft.branch.trim(),
      rating: Math.min(5, Math.max(0, Number(ratingText.replace(',', '.')) || 0)),
      orders: Math.max(0, parseInt(ordersText.replace(/\D/g, ''), 10) || 0),
      hoursFrom: fixTime(draft.hoursFrom),
      hoursTo: fixTime(draft.hoursTo),
      outcallNote: draft.outcall ? draft.outcallNote.trim() : '',
    };
    if (await run(() => saveMaster(m))) setDraft(null);
  };

  const editor = draft && (
    <Card style={{ gap: 12 }}>
      <Text style={styles.h}>{draft.id ? 'Мастерди өзгөртүү' : 'Жаңы мастер'}</Text>
      <Pressable onPress={pick} style={styles.photo} disabled={uploading}>
        {draft.photoUrl ? (
          <Image source={{ uri: draft.photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <MaterialCommunityIcons name="account-hard-hat" size={64} color={colors.primary} />
        )}
        <View style={styles.photoBtn}>
          {uploading ? <ActivityIndicator color="#fff" /> : <MaterialCommunityIcons name="camera-plus" size={18} color="#fff" />}
          <Text style={{ color: '#fff', fontWeight: '700' }}>{draft.photoUrl ? 'Сүрөттү алмаштыруу' : 'Сүрөт кошуу'}</Text>
        </View>
      </Pressable>
      <Field label="Аты-жөнү *" value={draft.name} onChangeText={(t) => setDraft({ ...draft, name: t })} placeholder="Мисалы: Азамат" />
      <Field label="Адистиги" value={draft.specialty} onChangeText={(t) => setDraft({ ...draft, specialty: t })} placeholder="Мисалы: Мотор жана контроллер" />
      <Field label="Тажрыйбасы" value={draft.experience} onChangeText={(t) => setDraft({ ...draft, experience: t })} placeholder="Мисалы: 5 жыл" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Рейтинг (0–5)" value={ratingText} onChangeText={setRatingText} keyboardType="decimal-pad" placeholder="4.9" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Аткарган заказдары" value={ordersText} onChangeText={setOrdersText} keyboardType="number-pad" placeholder="120" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Иштейт: саат канчадан" value={draft.hoursFrom} onChangeText={(t) => setDraft({ ...draft, hoursFrom: t })} placeholder="09:00" keyboardType="numbers-and-punctuation" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="саат канчага чейин" value={draft.hoursTo} onChangeText={(t) => setDraft({ ...draft, hoursTo: t })} placeholder="18:00" keyboardType="numbers-and-punctuation" />
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <Text style={styles.label}>Кайсы жерде иштейт (филиал)</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {branches.map(({ name: b }) => (
            <Chip key={b} label={b} active={draft.branch === b} onPress={() => setDraft({ ...draft, branch: draft.branch === b ? '' : b })} />
          ))}
        </View>
      </View>
      <View style={styles.outcall}>
        <View style={styles.row}>
          <MaterialCommunityIcons name="car-side" size={22} color={colors.primary} />
          <Text style={{ flex: 1, color: colors.text, fontWeight: '700', marginLeft: 8 }}>Жумуштан кийин выездге чыгат</Text>
          <Switch value={draft.outcall} onValueChange={(v) => setDraft({ ...draft, outcall: v })} trackColor={{ true: colors.primary, false: colors.border }} />
        </View>
        {draft.outcall && (
          <Field label="Выезд: убактысы жана баасы" value={draft.outcallNote} onChangeText={(t) => setDraft({ ...draft, outcallNote: t })} placeholder="Мисалы: 18:00–22:00, 500 сомдон" />
        )}
      </View>
      <View style={styles.row}>
        <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>Кардарларга көрсөтүү</Text>
        <Switch value={draft.active} onValueChange={(v) => setDraft({ ...draft, active: v })} trackColor={{ true: colors.primary, false: colors.border }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Жокко чыгаруу" variant="outline" style={{ flex: 1 }} onPress={() => setDraft(null)} />
        <Button title="Сактоо" icon="content-save" style={{ flex: 1 }} disabled={draft.name.trim().length < 2 || uploading} onPress={save} />
      </View>
    </Card>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
          Мастерлер башкы бетте жана «Оңдоо» бөлүмүндө сүрөттөрү менен көрүнөт. Кардар оңдоого жазылганда мастерди тандай алат.
        </Text>
        {error && <Text style={{ color: colors.danger }}>{error}</Text>}

        {draft && !draft.id ? editor : !draft && <Button title="Мастер кошуу" icon="account-plus" onPress={() => setDraft(empty())} />}
        {masters.length === 0 && !draft && <Text style={styles.empty}>Азырынча мастер жок</Text>}

        {masters.map((m) =>
          draft?.id === m.id ? (
            <View key={m.id}>{editor}</View>
          ) : (
            <Card key={m.id} style={[styles.row, { gap: 12 }]}>
              <View style={styles.thumb}>
                {m.photoUrl ? (
                  <Image source={{ uri: m.photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <MaterialCommunityIcons name="account-hard-hat" size={30} color={colors.primary} />
                )}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.name}>{m.name}</Text>
                {!!m.specialty && <Text style={{ color: colors.primary, fontSize: 13 }}>{m.specialty}</Text>}
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {[`⭐ ${m.rating.toFixed(1)}`, `${m.orders} заказ`, m.hoursFrom && m.hoursTo ? `${m.hoursFrom}–${m.hoursTo}` : '', m.branch].filter(Boolean).join(' · ')}
                </Text>
                {m.outcall && <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>🚗 Выезд{m.outcallNote ? `: ${m.outcallNote}` : ''}</Text>}
                {!m.active && <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>Жашырылган</Text>}
              </View>
              <View style={{ gap: 16, alignItems: 'center' }}>
                <Pressable hitSlop={8} onPress={() => setDraft(m)} accessibilityLabel="Өзгөртүү">
                  <MaterialCommunityIcons name="pencil" size={22} color={colors.primary} />
                </Pressable>
                {confirmId === m.id ? (
                  <Pressable hitSlop={8} onPress={() => run(() => deleteMaster(m.id))}>
                    <Text style={{ color: colors.danger, fontWeight: '800' }}>Ооба</Text>
                  </Pressable>
                ) : (
                  <Pressable hitSlop={8} onPress={() => setConfirmId(m.id)} accessibilityLabel="Өчүрүү">
                    <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.danger} />
                  </Pressable>
                )}
              </View>
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
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { fontWeight: '800', color: colors.text, fontSize: 16 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 24 },
  photo: { height: 220, borderRadius: radius.lg, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoBtn: { position: 'absolute', bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  outcall: { gap: 10, backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: 12 },
  thumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
