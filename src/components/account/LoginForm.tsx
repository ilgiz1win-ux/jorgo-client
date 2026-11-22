import { router } from 'expo-router';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../config/theme';
import { useT } from '../../i18n';
import { EmailLogin } from './EmailLogin';

const LOGO = require('../../../assets/brand/logo.png');

// Кирүү / катталуу Gmail (почта) коду менен гана
export function LoginForm({ onDone, subtitle }: { onDone: () => void; subtitle?: string }) {
  const { t } = useT();
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="Jorgo" />
          <Text style={styles.sub}>{subtitle ?? t('acc.login.sub')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{t('acc.signInUp')}</Text>
          <EmailLogin onDone={onDone} />
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
  sub: { color: colors.muted, fontSize: 15, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 28, padding: 20, gap: 16, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 22, fontWeight: '900', color: colors.text },
  terms: { color: colors.muted, textAlign: 'center', fontSize: 12, lineHeight: 18, paddingHorizontal: 12 },
});
