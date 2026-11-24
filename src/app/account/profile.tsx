import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, MenuGroup, MenuRow } from '../../components/account/MenuGroup';
import { RelativesForm } from '../../components/account/RelativesForm';
import { RequireAccount } from '../../components/account/RequireAccount';
import { Button } from '../../components/ui';
import { colors } from '../../config/theme';
import { docsReady, useAccount } from '../../context/AccountContext';
import { useToast } from '../../context/ToastContext';
import { useT } from '../../i18n';
import type { Profile } from '../../lib/account';

function EditRow({ label, value, onChange, placeholder, upper }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; upper?: boolean }) {
  return (
    <View style={styles.editRow}>
      <Text style={styles.editLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.editInput}
        autoCapitalize={upper ? 'characters' : 'sentences'}
        accessibilityLabel={label}
      />
    </View>
  );
}

function ProfileForm() {
  const { t } = useT();
  const { profile, save } = useAccount();
  const toast = useToast();
  const [p, setP] = useState<Profile>(profile!);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (profile) setP(profile);
  }, [profile]);
  const set = (k: keyof Profile) => (v: string) => setP((x) => ({ ...x, [k]: v }));
  const dirty = JSON.stringify(p) !== JSON.stringify(profile);

  const submit = async () => {
    setBusy(true);
    try {
      await save(p);
      toast.show(t('acc.saved'));
    } catch {
      toast.show(t('acc.err.unknown'));
    }
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Avatar name={p.fullName} size={76} light />
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={styles.heroName}>{p.fullName || '—'}</Text>
            <View style={styles.phonePill}>
              <Text style={styles.phonePillText}>{p.phone}</Text>
            </View>
          </View>
        </View>

        <View style={{ padding: 16, gap: 18 }}>
          <MenuGroup title={t('acc.personal')}>
            <View style={{ paddingHorizontal: 16 }}>
              <EditRow label={t('acc.name')} value={p.fullName} onChange={set('fullName')} />
              <EditRow label={t('acc.birth')} value={p.birthDate} onChange={set('birthDate')} placeholder={t('acc.birthPh')} />
              <EditRow label={t('acc.passportNo')} value={p.passportNo} onChange={set('passportNo')} placeholder="ID1234567" upper />
              <EditRow label={t('acc.issuedBy')} value={p.passportIssuedBy ?? ''} onChange={set('passportIssuedBy')} placeholder="МКК 216041" upper />
              <EditRow label={t('acc.address')} value={p.address} onChange={set('address')} placeholder={t('acc.addressPh')} />
              <EditRow label={t('acc.phone2')} value={p.phone2 ?? ''} onChange={set('phone2')} placeholder="+996 555 123 456" />
            </View>
          </MenuGroup>
          <RelativesForm value={p.relatives} onChange={(relatives) => setP((x) => ({ ...x, relatives }))} />
          {dirty && <Button title={t('acc.save')} icon="content-save" onPress={submit} disabled={busy || p.fullName.trim().length < 2} style={{ borderRadius: 999 }} />}

          <MenuGroup title={t('acc.account')}>
            <MenuRow
              first
              icon="folder-outline"
              label={t('acc.documents')}
              sub={docsReady(profile) ? (profile!.verified ? t('acc.verified') : t('acc.notVerified')) : t('acc.documentsSub')}
              onPress={() => router.push('/account/documents')}
            />
          </MenuGroup>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function ProfileScreen() {
  return (
    <RequireAccount next="/account/profile">
      <ProfileForm />
    </RequireAccount>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroName: { color: '#fff', fontSize: 24, fontWeight: '900' },
  phonePill: { alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  phonePillText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  editRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 2 },
  editLabel: { fontSize: 13, color: colors.muted },
  editInput: { fontSize: 17, fontWeight: '700', color: colors.text, paddingVertical: 4 },
});
