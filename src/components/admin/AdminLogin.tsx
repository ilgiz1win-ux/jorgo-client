import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { isRemote } from '../../config/backend';
import { SHOP } from '../../config/shop';
import { adminColors, colors } from '../../config/theme';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { Button, Card, Field } from '../ui';

export function AdminLogin() {
  const { login } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(await login(email, password));
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.head}>
        <MaterialCommunityIcons name="shield-account" size={56} color="#fff" />
        <Text style={styles.title}>{SHOP.name} Админ</Text>
        <Text style={styles.sub}>Товарларды, бааларды жана акцияларды башкаруу</Text>
      </View>
      <Card style={{ gap: 14 }}>
        {isRemote && (
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="admin@mail.com" />
        )}
        <Field
          label={isRemote ? 'Сырсөз' : 'PIN-код'}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          keyboardType={isRemote ? 'default' : 'number-pad'}
          placeholder={isRemote ? '••••••••' : '••••'}
          onSubmitEditing={submit}
        />
        {error && <Text style={{ color: colors.danger, fontWeight: '600' }}>{error}</Text>}
        <Button title={busy ? 'Кирүүдө…' : 'Кирүү'} icon="login" onPress={submit} disabled={busy || !password} />
        {!isRemote && (
          <Text style={styles.note}>
            Демо режим: сервер туташа элек, өзгөртүүлөр ушул түзмөктө гана сакталат. Демо PIN: 1234
          </Text>
        )}
      </Card>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 20, gap: 20, backgroundColor: adminColors.header },
  head: { alignItems: 'center', gap: 6 },
  title: { color: '#fff', fontSize: 26, fontWeight: '900' },
  sub: { color: '#CBD5E1', textAlign: 'center' },
  note: { color: colors.muted, fontSize: 13, textAlign: 'center' },
});
