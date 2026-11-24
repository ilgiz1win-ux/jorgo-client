import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { RentContract } from '../../../components/rent/RentContract';
import { colors } from '../../../config/theme';
import { fetchProfiles, Profile } from '../../../lib/account';
import { fetchRentRequests, RentRequest } from '../../../lib/rentRequests';

// Админ: ижара келишими (басып чыгарса болот)
export default function AdminContract() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [r, setR] = useState<RentRequest | null | undefined>(undefined);
  const [p, setP] = useState<Profile | null>(null);
  useEffect(() => {
    fetchRentRequests()
      .then((l) => {
        const x = l.find((y) => y.id === id) ?? null;
        setR(x);
        if (x?.userId) fetchProfiles([x.userId]).then((m) => setP(m[x.userId!] ?? null)).catch(() => {});
      })
      .catch(() => setR(null));
  }, [id]);
  if (r === undefined) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;
  if (!r || !r.contractNo)
    return (
      <View style={{ padding: 24 }}>
        <Text style={{ color: colors.muted, textAlign: 'center' }}>Келишим велосипед берилгенде түзүлөт.</Text>
      </View>
    );
  return (
    <>
      <Stack.Screen options={{ title: `Келишим №${r.contractNo}` }} />
      <RentContract r={r} p={p} printLabel="Басып чыгаруу / PDF" />
    </>
  );
}
