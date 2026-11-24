import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { RequireAccount } from '../../../components/account/RequireAccount';
import { RentContract } from '../../../components/rent/RentContract';
import { colors } from '../../../config/theme';
import { useAccount } from '../../../context/AccountContext';
import { useT } from '../../../i18n';
import { fetchMyRentRequests, RentRequest } from '../../../lib/rentRequests';

// Кардар: өзүнүн ижара келишими
function Contract() {
  const { t } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAccount();
  const [r, setR] = useState<RentRequest | null | undefined>(undefined);
  useEffect(() => {
    if (profile) fetchMyRentRequests(profile.id).then((l) => setR(l.find((x) => x.id === id) ?? null)).catch(() => setR(null));
  }, [profile, id]);
  if (r === undefined) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;
  if (!r || !r.contractNo)
    return (
      <View style={{ padding: 24 }}>
        <Text style={{ color: colors.muted, textAlign: 'center' }}>{t('ct.notYet')}</Text>
      </View>
    );
  return <RentContract r={r} p={profile} printLabel={t('ct.print')} />;
}

export default function ContractScreen() {
  const { t } = useT();
  return (
    <>
      <Stack.Screen options={{ title: t('ct.view').replace('📄 ', '') }} />
      <RequireAccount next="/account/rentals">
        <Contract />
      </RequireAccount>
    </>
  );
}
