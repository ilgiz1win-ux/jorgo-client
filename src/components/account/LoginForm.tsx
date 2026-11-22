import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Chip } from '../ui';
import { EmailLogin } from './EmailLogin';
import { colors } from '../../config/theme';
import { useAccount } from '../../context/AccountContext';
import { TKey, useT } from '../../i18n';
import { openWhatsApp } from '../../lib/format';

const LOGO = require('../../../assets/brand/logo.png');

// Кирүү / катталуу: телефон номери + сырсөз
export function LoginForm({ onDone, subtitle }: { onDone: () => void; subtitle?: string }) {
  const { t } = useT();
  const { signIn, signUp } = useAccount();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  // Негизги жол — почта (Gmail) коду; телефон + сырсөз да калды
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = phone.replace(/\D/g, '').length >= 9 && password.length >= 6 && (mode === 'in' || name.trim().length > 1);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const e = mode === 'in' ? await signIn(phone, password) : await signUp(phone, password, name);
    setBusy(false);
    if (e) {
      setError(t(`acc.err.${e}` as TKey));
      return;
    }
    onDone();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="Jorgo" />
          <Text style={styles.sub}>{subtitle ?? t('acc.login.sub')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{method === 'email' ? t('acc.signInUp') : mode === 'in' ? t('acc.signIn') : t('acc.signUp')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label={`✉️ ${t('acc.byEmail')}`} active={method === 'email'} onPress={() => setMethod('email')} />
            <Chip label={`📱 ${t('acc.byPhone')}`} active={method === 'phone'} onPress={() => setMethod('phone')} />
          </View>
          {method === 'email' ? (
            <EmailLogin onDone={onDone} />
          ) : (
            <>

          {mode === 'up' && (
            <View style={{ gap: 6 }}>
              <Text style={styles.label}>{t('acc.name')}</Text>
              <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Асанов Нурлан" placeholderTextColor={colors.muted} autoComplete="name" />
            </View>
          )}

          <View style={{ gap: 6 }}>
            <Text style={styles.label}>{t('acc.phone')}</Text>
            <View style={styles.phoneRow}>
              <View style={styles.prefix}>
                <Text style={{ fontSize: 16 }}>🇰🇬</Text>
                <Text style={styles.prefixText}>+996</Text>
              </View>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="700 123 456"
                placeholderTextColor={colors.muted}
                style={styles.phoneInput}
                autoComplete="tel"
                maxLength={16}
                accessibilityLabel={t('acc.phone')}
              />
            </View>
            <Text style={styles.hint}>{t('acc.phoneHint')}</Text>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={styles.label}>{t('acc.password')}</Text>
            <View style={styles.phoneRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!show}
                placeholder={t('acc.passwordHint')}
                placeholderTextColor={colors.muted}
                style={[styles.phoneInput, { paddingLeft: 14 }]}
                autoCapitalize="none"
                autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                accessibilityLabel={t('acc.password')}
                onSubmitEditing={() => valid && submit()}
              />
              <Pressable onPress={() => setShow(!show)} style={styles.eye} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('acc.password')}>
                <MaterialCommunityIcons name={show ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.muted} />
              </Pressable>
            </View>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}
          {busy ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: 14 }} />
          ) : (
            <Button title={mode === 'in' ? t('acc.signIn') : t('acc.signUp')} icon={mode === 'in' ? 'login' : 'account-plus'} disabled={!valid} onPress={submit} style={styles.pill} />
          )}

          <View style={styles.or}>
            <View style={styles.line} />
            <MaterialCommunityIcons name="bicycle-electric" size={18} color={colors.muted} />
            <View style={styles.line} />
          </View>

          <Button
            title={mode === 'in' ? t('acc.toSignUp') : t('acc.toSignIn')}
            variant="outline"
            onPress={() => {
              setMode(mode === 'in' ? 'up' : 'in');
              setError(null);
            }}
            style={styles.pill}
          />
          {mode === 'in' && (
            <Pressable onPress={() => openWhatsApp(t('acc.forgot')).catch(() => {})} hitSlop={6}>
              <Text style={styles.forgot}>{t('acc.forgot')}</Text>
            </Pressable>
          )}
            </>
          )}
        </View>

        <Pressable onPress={() => router.push({ pathname: '/account/info', params: { type: 'privacy' } })}>
          <Text style={styles.terms}>{t('acc.terms')}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 20, paddingBottom: 40 },
  logo: { width: 170, height: 96 },
  sub: { color: colors.muted, fontSize: 15 },
  card: { backgroundColor: colors.card, borderRadius: 28, padding: 20, gap: 16, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 22, fontWeight: '900', color: colors.text },
  label: { fontSize: 14, fontWeight: '700', color: colors.text },
  hint: { fontSize: 12, color: colors.muted },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: colors.text, backgroundColor: colors.card },
  phoneRow: { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.card },
  prefix: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, backgroundColor: colors.bg, borderRightWidth: 1, borderRightColor: colors.border },
  prefixText: { fontSize: 16, fontWeight: '600', color: colors.text },
  phoneInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 14, fontSize: 17, color: colors.text },
  eye: { justifyContent: 'center', paddingHorizontal: 14 },
  error: { color: colors.danger, fontWeight: '600' },
  pill: { borderRadius: 999 },
  or: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  forgot: { color: colors.primary, textAlign: 'center', fontWeight: '600', fontSize: 13 },
  terms: { color: colors.muted, textAlign: 'center', fontSize: 12, lineHeight: 18, paddingHorizontal: 12 },
});
