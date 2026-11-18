import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DocImage } from '../../components/account/DocImage';
import { RequireAccount } from '../../components/account/RequireAccount';
import { colors, radius } from '../../config/theme';
import { useAccount } from '../../context/AccountContext';
import { useToast } from '../../context/ToastContext';
import type { IconName } from '../../data/products';
import { TKey, useT } from '../../i18n';
import { DOC_KINDS, docPathKey, DocKind } from '../../lib/account';

const ICON: Record<DocKind, IconName> = { selfie: 'face-man-outline', passport: 'card-account-details-outline', license: 'card-bulleted-outline' };
const LABEL: Record<DocKind, TKey> = { selfie: 'acc.doc.selfie', passport: 'acc.doc.passport', license: 'acc.doc.license' };

function DocCard({ kind }: { kind: DocKind }) {
  const { t } = useT();
  const { profile, uploadDoc } = useAccount();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const path = profile?.[docPathKey(kind)];

  const pick = async (source: 'camera' | 'library') => {
    setOpen(false);
    setBusy(true);
    try {
      await uploadDoc(kind, source);
    } catch (e) {
      toast.show(e instanceof Error && e.message === 'camera' ? t('acc.doc.cameraDenied') : t('acc.doc.error'));
    }
    setBusy(false);
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.thumb}>
          {path ? <DocImage path={path} style={StyleSheet.absoluteFill} /> : <MaterialCommunityIcons name={ICON[kind]} size={28} color={colors.muted} />}
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.title}>
            {t(LABEL[kind])}
            {kind === 'license' ? <Text style={styles.optional}>{`  ${t('acc.doc.optional')}`}</Text> : null}
          </Text>
          <View style={[styles.status, path && { backgroundColor: colors.primarySoft }]}>
            <MaterialCommunityIcons name={path ? 'check-circle' : 'upload'} size={14} color={path ? colors.primary : colors.muted} />
            <Text style={[styles.statusText, path && { color: colors.primary }]}>{(path ? t('acc.doc.done') : t('acc.doc.none')).toUpperCase()}</Text>
          </View>
        </View>
        {busy ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Pressable
            style={styles.plus}
            onPress={() => (Platform.OS === 'web' ? pick('library') : setOpen(!open))}
            accessibilityRole="button"
            accessibilityLabel={t(LABEL[kind])}
          >
            <MaterialCommunityIcons name={path ? 'pencil' : 'plus'} size={24} color={colors.primary} />
          </Pressable>
        )}
      </View>
      {open && (
        <View style={styles.choices}>
          <Pressable style={styles.choice} onPress={() => pick('camera')}>
            <MaterialCommunityIcons name="camera" size={20} color={colors.primary} />
            <Text style={styles.choiceText}>{t('acc.doc.camera')}</Text>
          </Pressable>
          <Pressable style={styles.choice} onPress={() => pick('library')}>
            <MaterialCommunityIcons name="image" size={20} color={colors.primary} />
            <Text style={styles.choiceText}>{t('acc.doc.library')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function PassportNumber() {
  const { t } = useT();
  const { profile, save } = useAccount();
  const [v, setV] = useState(profile?.passportNo ?? '');
  const commit = () => {
    if (profile && v.trim().toUpperCase() !== profile.passportNo) save({ ...profile, passportNo: v.trim().toUpperCase() }).catch(() => {});
  };
  return (
    <View style={[styles.card, { gap: 6 }]}>
      <Text style={styles.optional}>{t('acc.passportNo')}</Text>
      <TextInput
        value={v}
        onChangeText={setV}
        onBlur={commit}
        onSubmitEditing={commit}
        placeholder="ID1234567"
        placeholderTextColor={colors.muted}
        autoCapitalize="characters"
        style={styles.passport}
        accessibilityLabel={t('acc.passportNo')}
      />
    </View>
  );
}

export default function Documents() {
  const { t } = useT();
  const { profile } = useAccount();
  return (
    <RequireAccount next="/account/documents">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {profile?.verified && (
          <View style={styles.verified}>
            <MaterialCommunityIcons name="shield-check" size={20} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '800' }}>{t('acc.verified')}</Text>
          </View>
        )}
        {DOC_KINDS.map((k) => (
          <DocCard key={k} kind={k} />
        ))}
        <PassportNumber />
        <View style={styles.note}>
          <MaterialCommunityIcons name="lock-outline" size={18} color={colors.muted} />
          <Text style={{ flex: 1, color: colors.muted, fontSize: 13, lineHeight: 19 }}>{t('acc.doc.private')}</Text>
        </View>
      </ScrollView>
    </RequireAccount>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  thumb: { width: 60, height: 60, borderRadius: radius.lg, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  optional: { fontSize: 12, fontWeight: '600', color: colors.muted },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 0.6 },
  plus: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  choices: { flexDirection: 'row', gap: 8, marginTop: 12 },
  choice: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 999, paddingVertical: 10 },
  choiceText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  passport: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: 1, paddingVertical: 4 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: 4 },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: 12 },
});
