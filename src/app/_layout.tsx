import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../config/theme';
import { CartProvider } from '../context/CartContext';

export default function RootLayout() {
  return (
    <CartProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
          headerBackTitle: 'Артка',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: 'Товар' }} />
        <Stack.Screen name="checkout" options={{ title: 'Буйрутма берүү' }} />
        <Stack.Screen name="orders" options={{ title: 'Менин буйрутмаларым' }} />
      </Stack>
    </CartProvider>
  );
}
