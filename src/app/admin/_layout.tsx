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
      <Stack.Screen name="services" options={{ title: 'Оңдоо кызматтары' }} />
      <Stack.Screen name="masters" options={{ title: 'Мастерлер' }} />
      <Stack.Screen name="stats" options={{ title: 'Статистика' }} />
      <Stack.Screen name="rentals" options={{ title: 'Аренда' }} />
      <Stack.Screen name="rent-requests" options={{ title: 'Ижара өтүнмөлөрү' }} />
      <Stack.Screen name="notifications" options={{ title: 'Билдирмелер' }} />
      <Stack.Screen name="admins" options={{ title: 'Админдер' }} />
      <Stack.Screen name="home" options={{ title: 'Башкы бет' }} />
      <Stack.Screen name="reviews" options={{ title: 'Пикирлер' }} />
      <Stack.Screen name="gallery" options={{ title: 'Галерея: чейин / кийин' }} />
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
