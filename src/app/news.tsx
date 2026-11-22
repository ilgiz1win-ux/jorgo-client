import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { BroadcastList } from '../components/BroadcastList';
import { PromoBanner } from '../components/PromoBanner';
import { SectionTitle } from '../components/ui';
import { colors } from '../config/theme';
import { useCatalog } from '../context/CatalogContext';
import { useT } from '../i18n';
import { Broadcast, fetchBroadcasts, markBroadcastsSeen } from '../lib/broadcasts';

// Дүкөндүн билдирмелери: жалпы жаңылыктар + активдүү акциялар
export default function News() {
  const { t } = useT();
  const { promos } = useCatalog();
  const [items, setItems] = useState<Broadcast[]>([]);
  const [seen, setSeen] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const active = promos.filter((p) => p.active);

  const load = useCallback(async () => {
    setLoading(true);
    setSeen((await AsyncStorage.getItem('jorgo.broadcastsSeen').catch(() => null)) ?? '');
    try {
      setItems(await fetchBroadcasts());
    } catch {
      setItems([]);
    }
    markBroadcastsSeen();
    setLoading(false);
  }, []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      {!loading && items.length === 0 && active.length === 0 && (
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 60 }}>
          <MaterialCommunityIcons name="bell-sleep-outline" size={44} color={colors.muted} />
          <Text style={{ color: colors.muted }}>{t('news.empty')}</Text>
        </View>
      )}
      <BroadcastList items={items} seenBefore={seen} />
      {active.length > 0 && (
        <>
          <SectionTitle>{t('news.promos')}</SectionTitle>
          {active.map((p) => (
            <PromoBanner key={p.id} promo={p} />
          ))}
        </>
      )}
    </ScrollView>
  );
}
