import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button, Card, Field } from '../../components/ui';
import { colors, radius } from '../../config/theme';
import { useContent } from '../../context/ContentContext';
import { periodsOf, priceFor, RentalBike } from '../../data/rentals';
import { newId } from '../../lib/catalogApi';
import { EMPTY_EQUIPMENT, Equipment, fetchEquipment, saveEquipment } from '../../lib/contentApi';
import { formatPrice } from '../../lib/format';
import { pickAndUploadImage } from '../../lib/pickImage';

type Draft = {
  id: string;
  name: string;
  imageUrl?: string;
  description: string;
  specs: string;
  priceDay: string;
  priceWeek: string;
  priceMonth: string;
  deposit: string;
  available: boolean;
  // Админ гана көрөт
  gpsNo: string;
  battery1No: string;
  battery2No: string;
};

const toNum = (s: string) => {
  const n = Number(s.replace(/[^\d]/g, ''));
  return n > 0 ? n : undefined;
};

const toDraft = (b?: RentalBike, e: Equipment = EMPTY_EQUIPMENT): Draft => ({
  id: b?.id ?? '',
  name: b?.name ?? '',
  imageUrl: b?.imageUrl,
  description: b?.description ?? '',
  specs: (b?.specs ?? []).map(([k, v]) => `${k}: ${v}`).join('\n'),
  priceDay: b?.priceDay ? String(b.priceDay) : '',
  priceWeek: b?.priceWeek ? String(b.priceWeek) : '',
  priceMonth: b?.priceMonth ? String(b.priceMonth) : '',
  deposit: b?.deposit ? String(b.deposit) : '',
  available: b?.available ?? true,
  gpsNo: e.gpsNo,
  battery1No: e.battery1No,
  battery2No: e.battery2No,
});

const fromDraft = (d: Draft): RentalBike => ({
  id: d.id || newId('rent'),
  name: d.name.trim(),
  imageUrl: d.imageUrl,
  description: d.description.trim(),
  specs: d.specs
    .split('\n')
    .map((l) => l.split(':'))
    .filter((p) => p.length >= 2 && p[0].trim())
    .map(([k, ...v]) => [k.trim(), v.join(':').trim()] as [string, string]),
  priceDay: undefined,
  priceWeek: toNum(d.priceWeek),
  priceMonth: toNum(d.priceMonth),
  deposit: toNum(d.deposit),
  available: d.available,
});

const PERIOD_LABEL = { day: 'күнүнө', week: 'жумасына', month: 'айына' } as const;

// Ижарага велосипеддер жана ижаранын шарттары
export default function AdminRentals() {
  const { rentals, rentTerms, saveRental, deleteRental, saveRentTerms } = useContent();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [terms, setTerms] = useState(rentTerms.text);
  const [termsMsg, setTermsMsg] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<Record<string, Equipment>>({});

  useEffect(() => {
    fetchEquipment()
      .then(setEquipment)
      .catch(() => {});
  }, []);

  useEffect(() => setTerms(rentTerms.text), [rentTerms.text]);

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

  const pick = async () => {
    if (!draft) return;
    setError(null);
    setUploading(true);
    try {
      const url = await pickAndUploadImage([4, 3]);
      if (url) setDraft((d) => (d ? { ...d, imageUrl: url } : d));
    } catch (e) {
      setError('Сүрөт жүктөлгөн жок: ' + (e instanceof Error ? e.message : ''));
    }
    setUploading(false);
  };

  const save = async () => {
    if (!draft) return;
    const bike = fromDraft(draft);
    const eq = { gpsNo: draft.gpsNo, battery1No: draft.battery1No, battery2No: draft.battery2No };
    const ok = await run(async () => {
      await saveRental(bike);
      await saveEquipment(bike.id, eq);
      setEquipment((m) => ({ ...m, [bike.id]: eq }));
    });
    if (ok) setDraft(null);
  };

  const hasPrice = draft && (toNum(draft.priceWeek) || toNum(draft.priceMonth));

  const editor = draft && (
    <Card style={{ gap: 12 }}>
      <Text style={styles.h}>{draft.id ? 'Велосипедди өзгөртүү' : 'Жаңы велосипед'}</Text>
      <Pressable onPress={pick} style={styles.photo} disabled={uploading}>
        {draft.imageUrl ? (
          <Image source={{ uri: draft.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <MaterialCommunityIcons name="bicycle-electric" size={56} color={colors.primary} />
        )}
        <View style={styles.photoBtn}>
          {uploading ? <ActivityIndicator color="#fff" /> : <MaterialCommunityIcons name="camera-plus" size={18} color="#fff" />}
          <Text style={{ color: '#fff', fontWeight: '700' }}>{draft.imageUrl ? 'Сүрөттү алмаштыруу' : 'Сүрөт кошуу'}</Text>
        </View>
      </Pressable>
      <Field label="Аталышы *" value={draft.name} onChangeText={(t) => setDraft({ ...draft, name: t })} placeholder="Мисалы: Курьерлер үчүн 48V" />
      <Text style={styles.label}>Баалар, сом (ижара жумага же айга гана) *</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Field label="Жумасына" value={draft.priceWeek} onChangeText={(t) => setDraft({ ...draft, priceWeek: t })} keyboardType="number-pad" placeholder="3500" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Айына" value={draft.priceMonth} onChangeText={(t) => setDraft({ ...draft, priceMonth: t })} keyboardType="number-pad" placeholder="12000" />
        </View>
      </View>
      <Field label="Күрөө (залог), сом" value={draft.deposit} onChangeText={(t) => setDraft({ ...draft, deposit: t })} keyboardType="number-pad" placeholder="5000" />
      <View style={styles.secret}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialCommunityIcons name="eye-off-outline" size={18} color="#B45309" />
          <Text style={{ fontWeight: '800', color: colors.text }}>GPS жана батареялар (кардарга көрүнбөйт)</Text>
        </View>
        <Field label="Велосипеддеги GPS номери" value={draft.gpsNo} onChangeText={(t) => setDraft({ ...draft, gpsNo: t })} placeholder="Мисалы: 865432101234567" autoCapitalize="characters" />
        <Field label="1-батареянын номери" value={draft.battery1No} onChangeText={(t) => setDraft({ ...draft, battery1No: t })} placeholder="Мисалы: B-001" autoCapitalize="characters" />
        <Field label="2-батареянын номери" value={draft.battery2No} onChangeText={(t) => setDraft({ ...draft, battery2No: t })} placeholder="Мисалы: B-002" autoCapitalize="characters" />
      </View>
      <Field label="Сүрөттөмө" value={draft.description} onChangeText={(t) => setDraft({ ...draft, description: t })} multiline />
      <Field label="Мүнөздөмөлөр (ар бири жаңы саптан)" value={draft.specs} onChangeText={(t) => setDraft({ ...draft, specs: t })} multiline placeholder={'Мотор: 500 Вт\nЖүрүш: 60 км'} />
      <View style={styles.toggle}>
        <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>Бош (ижарага берсе болот)</Text>
        <Switch value={draft.available} onValueChange={(v) => setDraft({ ...draft, available: v })} trackColor={{ true: colors.primary, false: colors.border }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Жокко чыгаруу" variant="outline" style={{ flex: 1 }} onPress={() => setDraft(null)} />
        <Button title="Сактоо" icon="content-save" style={{ flex: 1 }} disabled={draft.name.trim().length < 2 || !hasPrice || uploading} onPress={save} />
      </View>
    </Card>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>
          Бул велосипеддер кардарлардын колдонмосундагы «Аренда» барагында көрүнөт. Ижарада болсо «Бош» которгучун өчүрүңүз — кардарлар «Ижарада» деп көрөт.
        </Text>
        {error && <Text style={{ color: colors.danger }}>{error}</Text>}

        {draft && !draft.id ? editor : !draft && <Button title="Велосипед кошуу" icon="plus" onPress={() => setDraft(toDraft())} />}

        {rentals.length === 0 && !draft && <Text style={styles.empty}>Азырынча ижарага велосипед жок</Text>}

        {rentals.map((b) =>
          draft?.id === b.id ? (
            <View key={b.id}>{editor}</View>
          ) : (
            <Card key={b.id} style={styles.row}>
              <View style={styles.thumb}>
                {b.imageUrl ? (
                  <Image source={{ uri: b.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <MaterialCommunityIcons name="bicycle-electric" size={28} color={colors.primary} />
                )}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.name} numberOfLines={2}>
                  {b.name}
                </Text>
                <Text style={styles.prices} numberOfLines={2}>
                  {periodsOf(b)
                    .map((p) => `${formatPrice(priceFor(b, p)!)} ${PERIOD_LABEL[p]}`)
                    .join(' • ')}
                </Text>
                {!!equipment[b.id] && (equipment[b.id].gpsNo || equipment[b.id].battery1No || equipment[b.id].battery2No) ? (
                  <Text style={styles.equip} numberOfLines={2}>
                    {[equipment[b.id].gpsNo && `GPS: ${equipment[b.id].gpsNo}`, equipment[b.id].battery1No && `Бат.1: ${equipment[b.id].battery1No}`, equipment[b.id].battery2No && `Бат.2: ${equipment[b.id].battery2No}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                ) : null}
                <Text style={{ fontSize: 12, fontWeight: '700', color: b.available ? colors.success : colors.muted }}>
                  {b.available ? 'Бош' : 'Ижарада'}
                </Text>
              </View>
              <View style={{ alignItems: 'center', gap: 14 }}>
                <Switch
                  value={b.available}
                  onValueChange={(v) => {
                    run(() => saveRental({ ...b, available: v }));
                  }}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  accessibilityLabel="Бош"
                />
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <Pressable hitSlop={8} onPress={() => setDraft(toDraft(b, equipment[b.id]))} accessibilityLabel="Өзгөртүү">
                    <MaterialCommunityIcons name="pencil" size={22} color={colors.primary} />
                  </Pressable>
                  {confirmId === b.id ? (
                    <Pressable hitSlop={8} onPress={() => run(() => deleteRental(b.id))}>
                      <Text style={{ color: colors.danger, fontWeight: '800' }}>Ооба</Text>
                    </Pressable>
                  ) : (
                    <Pressable hitSlop={8} onPress={() => setConfirmId(b.id)} accessibilityLabel="Өчүрүү">
                      <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.danger} />
                    </Pressable>
                  )}
                </View>
              </View>
            </Card>
          ),
        )}

        <Card style={{ gap: 10, marginTop: 8 }}>
          <Text style={styles.h}>Ижаранын шарттары</Text>
          <Text style={styles.hint}>Ар бир шартты жаңы саптан жазыңыз. Кардарлар «Аренда» барагында көрөт.</Text>
          <Field
            label="Шарттар"
            value={terms}
            onChangeText={setTerms}
            multiline
            placeholder={'Паспорт керек\nКүрөө: 5000 сом\nЗаряддагыч менен берилет'}
          />
          {termsMsg && <Text style={{ color: colors.success, fontWeight: '600' }}>{termsMsg}</Text>}
          <Button
            title="Шарттарды сактоо"
            icon="content-save"
            onPress={async () => {
              setTermsMsg(null);
              if (await run(() => saveRentTerms({ text: terms.trim() }))) setTermsMsg('Сакталды');
            }}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  secret: { gap: 10, backgroundColor: '#FFFBEB', borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: '#FDE68A' },
  equip: { fontSize: 12, color: '#92400E', fontWeight: '600' },
  h: { fontSize: 16, fontWeight: '800', color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 24 },
  photo: { height: 180, borderRadius: radius.lg, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoBtn: { position: 'absolute', bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(15,23,42,0.75)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  thumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  prices: { fontSize: 13, color: colors.primary, fontWeight: '700' },
});
