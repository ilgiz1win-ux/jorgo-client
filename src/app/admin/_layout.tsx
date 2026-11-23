import { Redirect, Stack } from 'expo-router';
import { APP_VARIANT } from '../../config/variant';
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
      <Stack.Screen name="master/[id]" options={{ title: 'Мастердин аккаунту' }} />
      <Stack.Screen name="chats" options={{ title: 'Кардарлардын суроолору' }} />
      <Stack.Screen name="chat/[userId]" options={{ title: 'Чат' }} />
      <Stack.Screen name="assistant" options={{ title: 'ИИ жардамчы' }} />
      <Stack.Screen name="branches" options={{ title: 'Точкалар' }} />
      <Stack.Screen name="orders" options={{ title: 'Заказдар' }} />
      <Stack.Screen name="customers" options={{ title: 'Кардарлар' }} />
      <Stack.Screen name="customer/[id]" options={{ title: 'Кардар' }} />
      <Stack.Screen name="repairs" options={{ title: 'Оңдоо өтүнмөлөрү' }} />
      <Stack.Screen name="applications" options={{ title: 'Мастер болом дегендер' }} />
      <Stack.Screen name="stats" options={{ title: 'Статистика' }} />
      <Stack.Screen name="rentals" options={{ title: 'Аренда' }} />
      <Stack.Screen name="rent-requests" options={{ title: 'Ижара өтүнмөлөрү' }} />
      <Stack.Screen name="notifications" options={{ title: 'Билдирмелер' }} />
      <Stack.Screen name="broadcast" options={{ title: 'Билдирме жөнөтүү' }} />
      <Stack.Screen name="admins" options={{ title: 'Админдер' }} />
      <Stack.Screen name="home" options={{ title: 'Башкы бет' }} />
      <Stack.Screen name="reviews" options={{ title: 'Пикирлер' }} />
      <Stack.Screen name="gallery" options={{ title: 'Галерея: чейин / кийин' }} />
    </Stack>
  );
}

export default function AdminLayout() {
  // Кардарлардын колдонмосунда админ панель жок — ал өзүнчө дарек/колдонмо (APP_VARIANT=admin)
  if (APP_VARIANT !== 'admin') return <Redirect href="/" />;
  return (
    <AdminAuthProvider>
      <Gate />
    </AdminAuthProvider>
  );
}
