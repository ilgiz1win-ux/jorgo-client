import { router } from 'expo-router';
import { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '../../config/theme';
import { useAccount } from '../../context/AccountContext';
import { useT } from '../../i18n';
import { Button, Card } from '../ui';
import { Text } from 'react-native';

// Аккаунтка кирбесе — "Кирүү" баскычын көрсөтөт
export function RequireAccount({ children, next }: { children: ReactNode; next?: string }) {
  const { ready, profile } = useAccount();
  const { t } = useT();
  if (!ready)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  if (!profile)
    return (
      <View style={{ padding: 16 }}>
        <Card style={{ gap: 12, alignItems: 'center' }}>
          <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 15 }}>{t('acc.loginNeeded')}</Text>
          <Button title={t('acc.signIn')} icon="login" onPress={() => router.push({ pathname: '/account/login', params: next ? { next } : {} })} />
        </Card>
      </View>
    );
  return <>{children}</>;
}
