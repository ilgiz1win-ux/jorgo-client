import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar, MenuGroup, MenuRow } from '../../components/account/MenuGroup';
import { Button } from '../../components/ui';
import { colors } from '../../config/theme';
import { docsReady, useAccount } from '../../context/AccountContext';
import { useT } from '../../i18n';

// Меню: профиль, документтер, ижаралар, билдирмелер, төлөм, жөндөөлөр
export default function AccountMenu() {
  const { t } = useT();
  const { profile, ready } = useAccount();

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.user}>
        <Avatar name={profile?.fullName || (profile ? '' : t('acc.guest'))} size={64} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.name}>{profile ? profile.fullName || profile.phone : t('acc.guest')}</Text>
          <Text style={styles.phone}>{profile ? profile.phone : t('acc.guestSub')}</Text>
        </View>
      </View>

      {ready && !profile && <Button title={t('acc.signIn')} icon="login" onPress={() => router.replace('/rent')} />}

      {profile && (
        <MenuGroup>
          <MenuRow first icon="account-outline" label={t('acc.profile')} onPress={() => router.push('/account/profile')} />
          <MenuRow
            icon="folder-account-outline"
            label={t('acc.documents')}
            sub={docsReady(profile) ? (profile.verified ? t('acc.verified') : t('acc.notVerified')) : t('acc.documentsSub')}
            onPress={() => router.push('/account/documents')}
          />
          <MenuRow icon="bicycle-electric" label={t('acc.myRents')} onPress={() => router.push('/account/rentals')} />
        </MenuGroup>
      )}

      <MenuGroup>
        <MenuRow first icon="bell-outline" label={t('acc.notifications')} onPress={() => router.push('/account/notifications')} />
        <MenuRow icon="wallet-outline" label={t('acc.payments')} onPress={() => router.push('/account/payments')} />
        <MenuRow icon="cog-outline" label={t('acc.settings')} onPress={() => router.push('/account/settings')} />
      </MenuGroup>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 16, paddingBottom: 40 },
  user: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 },
  name: { fontSize: 20, fontWeight: '800', color: colors.text },
  phone: { fontSize: 14, color: colors.muted },
});
