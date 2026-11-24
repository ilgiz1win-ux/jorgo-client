import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, Tabs, usePathname } from 'expo-router';
import { View, type ColorValue } from 'react-native';
import { CartTabIcon } from '../../components/CartTabIcon';
import { FloatingWhatsApp } from '../../components/FloatingWhatsApp';
import { colors } from '../../config/theme';
import { APP_VARIANT } from '../../config/variant';
import { useCart } from '../../context/CartContext';
import type { IconName } from '../../data/products';
import { useIsMaster } from '../../hooks/useIsMaster';
import { useT } from '../../i18n';

const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => <MaterialCommunityIcons name={name} color={color as string} size={size} />;

export default function TabsLayout() {
  const { count } = useCart();
  const { t } = useT();
  const isMaster = useIsMaster();
  // Ижара бөлүмү дүкөндөн өзүнчө: ал жерде дүкөндүн менюсу жана WhatsApp баскычы көрүнбөйт
  const path = usePathname();
  const inRent = path === '/rent';
  // Мастердин табында WhatsApp баскычы керек эмес
  const hideWa = inRent || path === '/master';
  // Админ колдонмо дароо админ панелден ачылат
  if (APP_VARIANT === 'admin') return <Redirect href="/admin" />;
  return (
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tab.home'), headerShown: false, tabBarIcon: icon('home') }} />
      <Tabs.Screen name="catalog" options={{ title: t('tab.catalog'), tabBarIcon: icon('view-grid') }} />
      <Tabs.Screen name="rent" options={{ title: t('tab.rent'), headerShown: false, tabBarStyle: { display: 'none' }, tabBarIcon: icon('bicycle-electric') }} />
      <Tabs.Screen name="repair" options={{ title: t('tab.outcall'), tabBarIcon: icon('car-side') }} />
      <Tabs.Screen
        name="cart"
        options={{
          title: t('tab.cart'),
          tabBarIcon: CartTabIcon,
          tabBarBadge: count > 0 ? count : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.accent },
        }}
      />
      <Tabs.Screen name="master" options={{ title: t('mp.tab'), href: isMaster ? '/master' : null, tabBarIcon: icon('account-hard-hat') }} />
      <Tabs.Screen name="contacts" options={{ title: t('tab.contacts'), tabBarIcon: icon('phone') }} />
    </Tabs>
      {/* Ылдыйкы меню (болжол менен 50px) үстүндө */}
      {!hideWa && <FloatingWhatsApp bottomOffset={66} />}
    </View>
  );
}
