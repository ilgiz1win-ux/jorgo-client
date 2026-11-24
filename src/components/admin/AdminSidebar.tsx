import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { adminColors } from '../../config/theme';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { RENT_SECTIONS, SECTIONS, Tile } from './sections';
import { useAdminBadges } from './useAdminBadges';

const LOGO = require('../../../assets/brand/logo.png');

// Ноутбукта: сол жакта дайыма көрүнүп турган меню (телефондо жок — плиткалар колдонулат)
export function AdminSidebar() {
  const path = usePathname();
  const { logout, email } = useAdminAuth();
  const { unread, chatUnread, newRepairs } = useAdminBadges();
  const badge = (href: Tile['href']) => (href === '/admin/chats' ? chatUnread : href === '/admin/repairs' ? newRepairs : href === '/admin/notifications' ? unread : 0);
  const isHome = path === '/admin' || path === '/admin/' || path === '/';

  const item = (href: string, title: string, icon: Tile['icon'], color: string, n = 0) => {
    const active = href === '/admin' ? isHome : path.startsWith(href);
    return (
      <Pressable
        key={href}
        onPress={() => {
          // Стек тереңдебесин: башкы бет + азыр ачык бир бөлүм
          if (href === '/admin') {
            if (router.canDismiss()) router.dismissAll();
          } else if (!active) {
            if (router.canDismiss()) router.replace(href as never);
            else router.push(href as never);
          }
        }}
        style={(st) => [styles.item, active && styles.active, (st as { hovered?: boolean }).hovered && !active && styles.hover]}
        accessibilityRole="link"
      >
        <View style={[styles.icon, { backgroundColor: color }]}>
          <MaterialCommunityIcons name={icon} size={16} color="#fff" />
        </View>
        <Text style={[styles.label, active && { color: '#fff' }]} numberOfLines={1}>
          {title}
        </Text>
        {n > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{n > 99 ? '99+' : n}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.side}>
      <View style={styles.brand}>
        <Image source={LOGO} style={{ width: 120, height: 48 }} resizeMode="contain" />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        {item('/admin', 'Башкы бет · статистика', 'view-dashboard', '#16A34A')}
        <Text style={styles.group}>ИЖАРА</Text>
        {RENT_SECTIONS.map((t) => item(t.href, t.title, t.icon, t.color, badge(t.href)))}
        <Text style={styles.group}>ДҮКӨН ЖАНА ОҢДОО</Text>
        {SECTIONS.map((t) => item(t.href, t.title, t.icon, t.color, badge(t.href)))}
      </ScrollView>
      <Pressable onPress={logout} style={styles.logout}>
        <MaterialCommunityIcons name="logout" size={18} color="#CBD5E1" />
        <Text style={{ color: '#CBD5E1', fontWeight: '700', flex: 1 }} numberOfLines={1}>
          Чыгуу{email ? ` · ${email}` : ''}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  side: { width: 260, backgroundColor: adminColors.header, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.08)' },
  brand: { height: 64, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', margin: 10, borderRadius: 12 },
  group: { color: '#94A3B8', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 14, marginBottom: 4, marginHorizontal: 16 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12, marginHorizontal: 8, borderRadius: 10 },
  active: { backgroundColor: 'rgba(255,255,255,0.14)' },
  hover: { backgroundColor: 'rgba(255,255,255,0.06)' },
  icon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, color: '#E2E8F0', fontWeight: '700', fontSize: 14 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  logout: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
});
