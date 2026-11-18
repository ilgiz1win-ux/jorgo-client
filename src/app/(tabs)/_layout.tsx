import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';
import { CartTabIcon } from '../../components/CartTabIcon';
import { FloatingWhatsApp } from '../../components/FloatingWhatsApp';
import { colors } from '../../config/theme';
import { APP_VARIANT } from '../../config/variant';
import { useCart } from '../../context/CartContext';
import type { IconName } from '../../data/products';
import { useT } from '../../i18n';

const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => <MaterialCommunityIcons name={name} color={color as string} size={size} />;

export default function TabsLayout() {
  const { count } = useCart();
  const { t } = useT();
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
      <Tabs.Screen name="repair" options={{ title: t('tab.repair'), tabBarIcon: icon('wrench') }} />
      <Tabs.Screen
        name="cart"
        options={{
          title: t('tab.cart'),
          tabBarIcon: CartTabIcon,
          tabBarBadge: count > 0 ? count : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.accent },
        }}
      />
      <Tabs.Screen name="contacts" options={{ title: t('tab.contacts'), tabBarIcon: icon('phone') }} />
    </Tabs>
      {/* Ылдыйкы меню (болжол менен 50px) үстүндө */}
      <FloatingWhatsApp bottomOffset={66} />
    </View>
  );
}
