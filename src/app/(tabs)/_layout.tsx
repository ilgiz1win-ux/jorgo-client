import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { colors } from '../../config/theme';
import { useCart } from '../../context/CartContext';
import type { IconName } from '../../data/products';

const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => <MaterialCommunityIcons name={name} color={color as string} size={size} />;

export default function TabsLayout() {
  const { count } = useCart();
  return (
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
      <Tabs.Screen name="index" options={{ title: 'Башкы', headerShown: false, tabBarIcon: icon('home') }} />
      <Tabs.Screen name="catalog" options={{ title: 'Каталог', tabBarIcon: icon('view-grid') }} />
      <Tabs.Screen name="repair" options={{ title: 'Оңдоо', tabBarIcon: icon('wrench') }} />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Себет',
          tabBarIcon: icon('cart'),
          tabBarBadge: count > 0 ? count : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.accent },
        }}
      />
      <Tabs.Screen name="contacts" options={{ title: 'Байланыш', tabBarIcon: icon('phone') }} />
    </Tabs>
  );
}
