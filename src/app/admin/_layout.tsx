import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { AdminLogin } from '../../components/admin/AdminLogin';
import { adminColors, colors } from '../../config/theme';
import { AdminAuthProvider, useAdminAuth } from '../../context/AdminAuthContext';

function Gate() {
  const { ready, authed } = useAdminAuth();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!authed) return <AdminLogin />;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: adminColors.header },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.bg },
        headerBackTitle: 'Артка',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Админ панель' }} />
      <Stack.Screen name="product/[id]" options={{ title: 'Товар' }} />
      <Stack.Screen name="promos" options={{ title: 'Акциялар' }} />
    </Stack>
  );
}

export default function AdminLayout() {
  return (
    <AdminAuthProvider>
      <Gate />
    </AdminAuthProvider>
  );
}
