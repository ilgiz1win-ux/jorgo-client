import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../config/theme';
import { useAccount } from '../context/AccountContext';
import { useT } from '../i18n';

const LOGO_TEXT = require('../../assets/brand/logo-text.png');

// Ижара бөлүмүнүн башы: дүкөнгө кайтуу, логотип, меню (кирген болсо)
export function RentHeader() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const { profile } = useAccount();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <Pressable style={styles.shop} onPress={() => router.navigate('/')} accessibilityRole="button" accessibilityLabel={t('rent.backShop')} hitSlop={6}>
        <MaterialCommunityIcons name="storefront-outline" size={20} color={colors.text} />
        <Text style={styles.shopText}>{t('rent.backShop')}</Text>
      </Pressable>
      <Image source={LOGO_TEXT} style={styles.logo} resizeMode="contain" accessibilityLabel="Jorgo" />
      <View style={{ width: 96, alignItems: 'flex-end' }}>
        {profile && (
          <Pressable style={styles.btn} onPress={() => router.push('/account')} accessibilityRole="button" accessibilityLabel={t('acc.menu')} hitSlop={6}>
            <MaterialCommunityIcons name="menu" size={24} color={colors.text} />
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
  btn: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  logo: { width: 120, height: 38 },
});
