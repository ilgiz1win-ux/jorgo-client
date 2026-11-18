import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { NotificationList } from '../../components/NotificationList';
import { colors } from '../../config/theme';
import { AppNotification, fetchNotifications, markAllRead } from '../../lib/notifications';

// Админдин билдирмелери: жаңы өтүнмөлөр, бүгүн төлөй тургандар, кечиккендер
export default function AdminNotifications() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchNotifications());
      markAllRead().catch(() => {});
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes('notifications') ? 'SQL иштетиле элек (010_notifications.sql).' : msg);
    }
    setLoading(false);
  }, []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      {error && <Text style={{ color: colors.danger }}>{error}</Text>}
      {!loading && !error && items.length === 0 && (
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 60 }}>
          <MaterialCommunityIcons name="bell-sleep-outline" size={44} color={colors.muted} />
          <Text style={{ color: colors.muted }}>Билдирме жок</Text>
        </View>
      )}
      <NotificationList items={items} />
    </ScrollView>
  );
}
