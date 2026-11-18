import { Stack } from 'expo-router';
import { colors } from '../../config/theme';
import { useT } from '../../i18n';

export default function AccountLayout() {
  const { t } = useT();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
        headerBackTitle: t('nav.back'),
      }}
    >
      <Stack.Screen name="index" options={{ title: t('acc.menu') }} />
      <Stack.Screen name="login" options={{ title: '' }} />
      <Stack.Screen name="profile" options={{ title: t('acc.profile'), headerStyle: { backgroundColor: colors.primaryDark }, headerTintColor: '#fff' }} />
      <Stack.Screen name="documents" options={{ title: t('acc.documents') }} />
      <Stack.Screen name="settings" options={{ title: t('acc.settings') }} />
      <Stack.Screen name="notifications" options={{ title: t('acc.notifications') }} />
      <Stack.Screen name="rentals" options={{ title: t('acc.myRents') }} />
      <Stack.Screen name="payments" options={{ title: t('acc.payments') }} />
      <Stack.Screen name="info" options={{ title: '' }} />
    </Stack>
  );
}
