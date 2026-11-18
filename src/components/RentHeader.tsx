import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../config/theme';
import { useAccount } from '../context/AccountContext';
import { useT } from '../i18n';
import { useUnread } from '../lib/useUnread';

const LOGO_TEXT = require('../../assets/brand/logo-text.png');

// Ижара бөлүмүнүн башы: дүкөнгө кайтуу, логотип, меню (кирген болсо)
export function RentHeader() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const { profile } = useAccount();
  const unread = useUnread(!!profile);
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <Pressable style={styles.shop} onPress={() => router.navigate('/')} accessibilityRole="button" accessibilityLabel={t('rent.backShop')} hitSlop={6}>
        <MaterialCommunityIcons name="storefront-outline" size={20} color={colors.text} />
        <Text style={styles.shopText}>{t('rent.backShop')}</Text>
      </Pressable>
      <Image source={LOGO_TEXT} style={styles.logo} resizeMode="contain" accessibilityLabel="Jorgo" />
      <View style={{ width: 96, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
        {profile && (
          <Pressable
            style={styles.btn}
            onPress={() => router.push('/account/notifications')}
            accessibilityRole="button"
            accessibilityLabel={t('acc.notifications')}
            hitSlop={6}
          >
            <MaterialCommunityIcons name="bell-outline" size={22} color={colors.text} />
            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </Pressable>
        )}
        {profile && (
          <Pressable style={styles.btn} onPress={() => router.push('/account')} accessibilityRole="button" accessibilityLabel={t('acc.menu')} hitSlop={6}>
            <MaterialCommunityIcons name="menu" size={22} color={colors.text} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10, backgroundColor: colors.bg },
  shop: { width: 96, flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 12, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  shopText: { fontSize: 13, fontWeight: '700', color: colors.text },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  btn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  logo: { width: 120, height: 38 },
});
