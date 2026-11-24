import { useEffect, useRef } from 'react';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { PushHandler } from '../components/PushHandler';
import { SplashIntro } from '../components/SplashIntro';
import { colors } from '../config/theme';
import { APP_VARIANT } from '../config/variant';
import { AccountProvider } from '../context/AccountContext';
import { CartProvider } from '../context/CartContext';
import { CatalogProvider } from '../context/CatalogContext';
import { ContentProvider } from '../context/ContentContext';
import { ToastProvider } from '../context/ToastContext';
import { LanguageProvider, useT } from '../i18n';
import { track } from '../lib/analytics';

function RootStack() {
  const { t } = useT();
  // Логотип экраны кардарлар үчүн гана, админ панелде көрсөтүлбөйт
  const isClient = useRef(APP_VARIANT === 'client' && !usePathname().startsWith('/admin')).current;
  const showSplash = isClient;
  // Статистика: колдонмо ачылды (админ панелди эсептебейбиз)
  useEffect(() => {
    if (isClient) track('visit');
  }, [isClient]);
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
          headerBackTitle: t('nav.back'),
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: t('nav.product') }} />
        <Stack.Screen name="checkout" options={{ title: t('nav.checkout') }} />
        <Stack.Screen name="orders" options={{ title: t('nav.orders') }} />
        <Stack.Screen name="news" options={{ title: t('news.title') }} />
        <Stack.Screen name="masters" options={{ title: t('masters.title') }} />
        <Stack.Screen name="master-panel" options={{ title: t('mp.title') }} />
        <Stack.Screen name="become-master" options={{ title: t('ma.title') }} />
        <Stack.Screen name="chat" options={{ title: t('chat.title') }} />
        <Stack.Screen name="wallet" options={{ title: t('w.title') }} />
        <Stack.Screen name="review" options={{ title: t('rv.title') }} />
        <Stack.Screen name="account" options={{ headerShown: false }} />
        <Stack.Screen
          name="rental/[id]"
          options={{ title: t('rent.tariffs'), headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text, headerShadowVisible: false }}
        />
        <Stack.Screen
          name="rental/checkout"
          options={{ title: t('rent.checkout'), headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text, headerShadowVisible: false }}
        />
        <Stack.Screen name="rental/contract/[id]" options={{ title: t('ct.view').replace('📄 ', '') }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
      {showSplash && <SplashIntro />}
      {Platform.OS !== 'web' && <PushHandler />}
    </>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <CatalogProvider>
        <ContentProvider>
          <AccountProvider>
            <CartProvider>
              <ToastProvider>
                <RootStack />
              </ToastProvider>
            </CartProvider>
          </AccountProvider>
        </ContentProvider>
      </CatalogProvider>
    </LanguageProvider>
  );
}
