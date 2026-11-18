import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../config/theme';
import { useT } from '../i18n';

const LOGO_TEXT = require('../../assets/brand/logo-text.png');

// Ижара бөлүмүнүн башы: меню ☰, логотип, билдирмелер 🔔
export function RentHeader() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <Pressable style={styles.btn} onPress={() => router.push('/account')} accessibilityRole="button" accessibilityLabel={t('acc.menu')} hitSlop={6}>
        <MaterialCommunityIcons name="menu" size={24} color={colors.text} />
      </Pressable>
      <Image source={LOGO_TEXT} style={styles.logo} resizeMode="contain" accessibilityLabel="Jorgo" />
      <Pressable
        style={styles.btn}
        onPress={() => router.push('/account/notifications')}
        accessibilityRole="button"
        accessibilityLabel={t('acc.notifications')}
        hitSlop={6}
      >
        <MaterialCommunityIcons name="bell-outline" size={24} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10, backgroundColor: colors.bg },
  btn: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  logo: { width: 150, height: 44 },
});
