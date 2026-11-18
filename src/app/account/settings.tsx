import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MenuGroup, MenuRow } from '../../components/account/MenuGroup';
import { colors } from '../../config/theme';
import { useAccount } from '../../context/AccountContext';
import { useToast } from '../../context/ToastContext';
import { LANGS, useT } from '../../i18n';

const LOGO = require('../../../assets/brand/logo.png');

// Web'де Alert.alert баскычтары иштебейт — window.confirm колдонобуз
function confirm(text: string, yes: string, no: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(typeof window !== 'undefined' && window.confirm(text));
  return new Promise((resolve) =>
    Alert.alert('', text, [
      { text: no, style: 'cancel', onPress: () => resolve(false) },
      { text: yes, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

export default function Settings() {
  const { t, lang, setLang } = useT();
  const { profile, signOut, deleteAccount } = useAccount();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!(await confirm(t('acc.deleteConfirm'), t('acc.yes'), t('acc.cancel')))) return;
    setBusy(true);
    try {
      await deleteAccount();
      router.replace('/account');
    } catch {
      toast.show(t('acc.err.unknown'));
    }
    setBusy(false);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 40 }}>
      <MenuGroup title={t('acc.language')}>
        {LANGS.map((l, i) => {
          const on = l.id === lang;
          return (
            <MenuRow
              key={l.id}
              first={i === 0}
              icon="web"
              label={l.name}
              onPress={() => setLang(l.id)}
              right={on ? <MaterialCommunityIcons name="check-circle" size={24} color={colors.primary} /> : <View />}
            />
          );
        })}
      </MenuGroup>

      <MenuGroup title={t('acc.about')}>
        <MenuRow first icon="file-document-outline" label={t('acc.rentTerms')} onPress={() => router.push({ pathname: '/account/info', params: { type: 'terms' } })} />
        <MenuRow icon="shield-account-outline" label={t('acc.privacy')} onPress={() => router.push({ pathname: '/account/info', params: { type: 'privacy' } })} />
      </MenuGroup>

      {profile && (
        <MenuGroup title={t('acc.account')}>
          <MenuRow
            first
            icon="logout"
            label={t('acc.logout')}
            onPress={async () => {
              await signOut();
              router.replace('/account');
            }}
          />
          <MenuRow icon="delete-outline" label={t('acc.delete')} danger onPress={busy ? undefined : remove} />
        </MenuGroup>
      )}

      <View style={styles.footer}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={styles.version}>v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  footer: { alignItems: 'center', gap: 4, marginTop: 8, opacity: 0.45 },
  logo: { width: 110, height: 60 },
  version: { color: colors.muted, fontSize: 13 },
});
