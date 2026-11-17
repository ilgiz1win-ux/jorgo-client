import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../config/theme';
import { CartProvider } from '../context/CartContext';
import { CatalogProvider } from '../context/CatalogContext';
import { ToastProvider } from '../context/ToastContext';

export default function RootLayout() {
  return (
    <CatalogProvider>
    <CartProvider>
    <ToastProvider>
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
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
    </ToastProvider>
    </CartProvider>
    </CatalogProvider>
  );
}
