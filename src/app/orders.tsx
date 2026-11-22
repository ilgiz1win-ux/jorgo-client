import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OrderStatusCard } from '../components/OrderStatusCard';
import { Card, SectionTitle } from '../components/ui';
import { colors } from '../config/theme';
import { useAccount } from '../context/AccountContext';
import { useCart } from '../context/CartContext';
import { useT } from '../i18n';
import { formatPrice } from '../lib/format';
import { fetchOrders, ServerOrder } from '../lib/orders';

// Менин буйрутмаларым: экспресс заказдары абалы менен (аккаунт болсо) + ушул телефондогу мурунку буйрутмалар
export default function Orders() {
  const { orders } = useCart();
  const { profile } = useAccount();
  const { t } = useT();
  const [server, setServer] = useState<ServerOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return setServer([]);
    setLoading(true);
    try {
      setServer(await fetchOrders(profile.id));
    } catch {
      setServer([]);
    }
    setLoading(false);
  }, [profile]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Экспресс заказдары тизмеде эки жолу чыкпасын
  const serverNumbers = new Set(server.map((o) => o.number));
  const local = orders.filter((o) => !serverNumbers.has(o.id));

  if (!local.length && !server.length) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.muted }}>{t('orders.empty')}</Text>
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      {server.length > 0 && <SectionTitle>{t('order.express')}</SectionTitle>}
      {server.map((o) => (
        <OrderStatusCard key={o.id} order={o} />
      ))}
      {server.length > 0 && local.length > 0 && <SectionTitle>{t('order.local')}</SectionTitle>}
      {local.map((o) => (
        <Card key={o.id} style={{ gap: 6 }}>
          <View style={styles.row}>
            <Text style={styles.h}>№{o.id}</Text>
            <Text style={{ color: colors.muted }}>{new Date(o.date).toLocaleDateString('ru-RU')}</Text>
          </View>
          {o.items.map((it) => (
            <Text key={it.name} style={{ color: colors.text }}>
              • {it.name} × {it.qty}
            </Text>
          ))}
          <Text style={[styles.h, { color: colors.primary }]}>{formatPrice(o.total)}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  h: { fontSize: 16, fontWeight: '800', color: colors.text },
});
