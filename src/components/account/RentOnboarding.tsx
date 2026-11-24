import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../config/theme';
import { useAccount } from '../../context/AccountContext';
import { useToast } from '../../context/ToastContext';
import { useT } from '../../i18n';
import { Button, Field } from '../ui';
import { DocCard } from './DocCard';
import { RelativesForm } from './RelativesForm';
import { formatPhone, normalizePhone, relativesReady, type Relative } from '../../lib/account';

// Ижаранын кадамдары: 1 Кирүү → 2 Паспорт → 3 Ижара
export function RentSteps({ step }: { step: 1 | 2 | 3 }) {
  const { t } = useT();
  const items = [t('rent.step1'), t('rent.step2'), t('rent.step3')];
  return (
    <View style={styles.steps}>
      {items.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const on = n === step;
        return (
          <View key={label} style={styles.step}>
            <View style={[styles.dot, (done || on) && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              {done ? <MaterialCommunityIcons name="check" size={14} color="#fff" /> : <Text style={[styles.dotText, on && { color: '#fff' }]}>{n}</Text>}
            </View>
            <Text style={[styles.stepText, (done || on) && { color: colors.text }]}>{label}</Text>
            {n < 3 && <View style={[styles.bar, done && { backgroundColor: colors.primary }]} />}
          </View>
        );
      })}
    </View>
  );
}

// Биринчи жолу: аты-жөнү, туулган күнү, паспорт номери, дареги жана документтердин сүрөттөрү
export function RentOnboarding() {
  const { t } = useT();
  const { profile, save } = useAccount();
  const toast = useToast();
  const [name, setName] = useState(profile?.fullName ?? '');
  const [birth, setBirth] = useState(profile?.birthDate ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [passport, setPassport] = useState(profile?.passportNo ?? '');
  const [address, setAddress] = useState(profile?.address ?? '');
  const [issuedBy, setIssuedBy] = useState(profile?.passportIssuedBy ?? '');
  const [phone2, setPhone2] = useState(profile?.phone2 ?? '');
  const [relatives, setRelatives] = useState<Relative[]>(profile?.relatives ?? []);
  const [busy, setBusy] = useState(false);
  if (!profile) return null;

  const phoneNorm = normalizePhone(phone);
  const valid = !!phoneNorm && name.trim().length > 1 && passport.trim().length >= 5 && issuedBy.trim().length >= 3 && address.trim().length >= 3 && !!profile.selfiePath && !!profile.passportPath && relativesReady(relatives);

  const submit = async () => {
    setBusy(true);
    try {
      await save({ ...profile, phone: phoneNorm ? formatPhone(phoneNorm) : phone.trim(), fullName: name.trim(), birthDate: birth.trim(), passportNo: passport.trim().toUpperCase(), address: address.trim(), passportIssuedBy: issuedBy.trim(), phone2: phone2.trim(), relatives });
    } catch {
      toast.show(t('acc.err.unknown'));
    }
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <RentSteps step={2} />
        <View style={{ gap: 4 }}>
          <Text style={styles.title}>{t('rent.onbTitle')}</Text>
          <Text style={styles.sub}>{t('rent.onbSub')}</Text>
        </View>

        <View style={styles.card}>
          <Field label={`${t('acc.name')} *`} value={name} onChangeText={setName} placeholder="Асанов Нурлан" autoComplete="name" />
          <Field label={t('acc.phoneRequired')} value={phone} onChangeText={setPhone} placeholder="+996 700 123 456" keyboardType="phone-pad" autoComplete="tel" />
          <Field label={t('acc.birth')} value={birth} onChangeText={setBirth} placeholder={t('acc.birthPh')} keyboardType="numbers-and-punctuation" />
          <Field label={`${t('acc.passportNo')} *`} value={passport} onChangeText={setPassport} placeholder="ID1234567" autoCapitalize="characters" />
          <Field label={`${t('acc.issuedBy')} *`} value={issuedBy} onChangeText={setIssuedBy} placeholder="МКК 216041" autoCapitalize="characters" />
          <Field label={`${t('acc.address')} *`} value={address} onChangeText={setAddress} placeholder={t('acc.addressPh')} />
          <Field label={t('acc.phone2')} value={phone2} onChangeText={setPhone2} placeholder="+996 555 123 456" keyboardType="phone-pad" />
        </View>

        <DocCard kind="selfie" />
        <DocCard kind="passport" />
        <DocCard kind="license" />

        <RelativesForm value={relatives} onChange={setRelatives} />

        <View style={styles.note}>
          <MaterialCommunityIcons name="lock-outline" size={18} color={colors.muted} />
          <Text style={{ flex: 1, color: colors.muted, fontSize: 13, lineHeight: 19 }}>{t('acc.doc.private')}</Text>
        </View>

        {busy ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: 14 }} />
        ) : (
          <Button title={t('rent.continue')} icon="arrow-right" disabled={!valid} onPress={submit} style={{ borderRadius: 999 }} />
        )}
        {!valid && <Text style={[styles.sub, { textAlign: 'center' }]}>{t('rent.onbFill')}</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border },
  step: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  dotText: { fontSize: 12, fontWeight: '800', color: colors.muted },
  stepText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  bar: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 4 },
  title: { fontSize: 24, fontWeight: '900', color: colors.text },
  sub: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  card: { backgroundColor: colors.card, borderRadius: 24, padding: 16, gap: 14, borderWidth: 1, borderColor: colors.border },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: 4 },
});
