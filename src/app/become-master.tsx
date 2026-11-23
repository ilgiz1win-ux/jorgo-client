import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PopIn } from '../components/anim';
import { Button, Card, Chip, Field } from '../components/ui';
import { colors } from '../config/theme';
import { useContent } from '../context/ContentContext';
import { useT } from '../i18n';
import { branchLabel } from '../lib/branches';
import { sendApplication } from '../lib/repairs';

// «Мастер болгуңуз келеби?» — жумушка өтүнмө; админге келет
export default function BecomeMaster() {
  const { t } = useT();
  const { branches } = useContent();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+996 ');
  const [experience, setExperience] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [branch, setBranch] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = name.trim().length > 1 && phone.replace(/\D/g, '').length >= 9;

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await sendApplication({ name, phone, experience, specialty, branch, comment });
      setSent(true);
    } catch {
      setError(t('ma.error'));
    }
    setBusy(false);
  };

  if (sent) {
    return (
      <View style={styles.done}>
        <PopIn>
          <MaterialCommunityIcons name="check-circle" size={72} color={colors.success} />
        </PopIn>
        <Text style={styles.doneText}>{t('ma.sent')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <MaterialCommunityIcons name="account-hard-hat" size={40} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{t('ma.cta')}</Text>
            <Text style={{ color: colors.primarySoft }}>{t('ma.ctaSub')}</Text>
          </View>
        </View>
        <Card style={{ gap: 12 }}>
          <Field label={t('common.name')} value={name} onChangeText={setName} placeholder={t('checkout.namePh')} />
          <Field label={t('common.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label={t('ma.experience')} value={experience} onChangeText={setExperience} placeholder={t('ma.experiencePh')} />
          <Field label={t('ma.specialty')} value={specialty} onChangeText={setSpecialty} placeholder={t('ma.specialtyPh')} />
          <View style={{ gap: 6 }}>
            <Text style={styles.label}>{t('ma.branch')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {branches.map((b, i) => (
                <Chip key={b.name + i} label={`📍 ${branchLabel(b, t)}`} active={branch === b.name} onPress={() => setBranch(branch === b.name ? '' : b.name)} />
              ))}
            </View>
          </View>
          <Field label={t('ma.comment')} value={comment} onChangeText={setComment} multiline />
          {error && <Text style={{ color: colors.danger }}>{error}</Text>}
          <Button title={t('ma.send')} icon="send" disabled={!valid || busy} onPress={send} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primary, borderRadius: 18, padding: 16 },
  heroTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  doneText: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
});
