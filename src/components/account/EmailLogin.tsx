import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../../config/theme';
import { useAccount } from '../../context/AccountContext';
import { TKey, useT } from '../../i18n';
import { Button } from '../ui';

// Gmail (почта) менен кирүү: 1) почта → код жөнөтүү 2) 6 сандуу код → кирүү. Жаңы кардар ушундай катталат.
export function EmailLogin({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const { sendEmailCode, verifyEmailCode } = useAccount();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    const e = await sendEmailCode(email);
    setBusy(false);
    if (e) return setError(t(`acc.err.${e}` as TKey));
    setSent(true);
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    const e = await verifyEmailCode(email, code);
    setBusy(false);
    if (e) return setError(t(`acc.err.${e}` as TKey));
    onDone();
  };

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 6 }}>
        <Text style={styles.label}>{t('acc.email')}</Text>
        <TextInput
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (sent) setSent(false);
          }}
          placeholder="example@gmail.com"
          placeholderTextColor={colors.muted}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          accessibilityLabel={t('acc.email')}
        />
      </View>

      {sent && (
        <View style={{ gap: 6 }}>
          <Text style={styles.hint}>{t('acc.codeSent', { email: email.trim() })}</Text>
          <TextInput
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 8))}
            placeholder="123456"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.code]}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            accessibilityLabel={t('acc.code')}
            onSubmitEditing={() => code.length >= 6 && verify()}
          />
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      {busy ? (
        <ActivityIndicator color={colors.primary} style={{ paddingVertical: 14 }} />
      ) : sent ? (
        <>
          <Button title={t('acc.signIn')} icon="login" disabled={code.length < 6} onPress={verify} style={styles.pill} />
          <Pressable onPress={send} hitSlop={6}>
            <Text style={styles.link}>{t('acc.resend')}</Text>
          </Pressable>
        </>
      ) : (
        <Button title={t('acc.sendCode')} icon="email-fast-outline" disabled={email.trim().length < 5} onPress={send} style={styles.pill} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '700', color: colors.text },
  hint: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: colors.text, backgroundColor: colors.card },
  code: { fontSize: 24, letterSpacing: 8, textAlign: 'center', fontWeight: '800' },
  error: { color: colors.danger, fontWeight: '600' },
  pill: { borderRadius: 999 },
  link: { color: colors.primary, textAlign: 'center', fontWeight: '700', fontSize: 13 },
});
