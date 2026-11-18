import { useRef } from 'react';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SplashIntro } from '../components/SplashIntro';
import { colors } from '../config/theme';
import { APP_VARIANT } from '../config/variant';
import { CartProvider } from '../context/CartContext';
import { CatalogProvider } from '../context/CatalogContext';
import { ContentProvider } from '../context/ContentContext';
import { ToastProvider } from '../context/ToastContext';

export default function RootLayout() {
  // Логотип экраны кардарлар үчүн гана, админ панелде көрсөтүлбөйт
  const showSplash = useRef(APP_VARIANT === 'client' && !usePathname().startsWith('/admin')).current;
  return (
    <CatalogProvider>
    <ContentProvider>
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
      {showSplash && <SplashIntro />}
    </ToastProvider>
    </CartProvider>
    </ContentProvider>
    </CatalogProvider>
  );
}
