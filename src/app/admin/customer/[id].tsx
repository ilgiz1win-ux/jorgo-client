import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ComponentProps, useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { DocImage } from '../../../components/account/DocImage';
import { OrderStatusCard } from '../../../components/OrderStatusCard';
import { Button, Card, Field } from '../../../components/ui';
import { colors, radius } from '../../../config/theme';
import { docUrl, fetchProfiles, Profile, setVerified } from '../../../lib/account';
import { formatPrice } from '../../../lib/format';
import { addToBlacklist, Customer, fetchBlacklist, fetchCustomers, fetchOrders, phone9, removeFromBlacklist, ServerOrder } from '../../../lib/orders';
import { fetchRentRequests, RentRequest } from '../../../lib/rentRequests';

type Icon = ComponentProps<typeof MaterialCommunityIcons>['name'];
const RENT_LABEL: Record<string, string> = { new: 'Жаңы', active: 'Ижарада', returned: 'Кайтарылды', rejected: 'Четке кагылды' };
const UNIT: Record<string, string> = { day: 'күн', week: 'жума', month: 'ай' };
const tel = (p: string) => Linking.openURL(`tel:${p.replace(/[^\d+]/g, '')}`);

function Row({ icon, label, value, onPress }: { icon: Icon; label: string; value?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress || !value} style={styles.row}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.muted} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, onPress && !!value && { color: colors.primary, textDecorationLine: 'underline' }]} selectable>
        {value || '—'}
      </Text>
    </Pressable>
  );
}

// Кардардын толук аккаунту (админ гана): маалыматы, документтери, туугандары, заказдары, ижаралары
export default function AdminCustomer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [p, setP] = useState<Profile | null>(null);
  const [c, setC] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<ServerOrder[]>([]);
  const [rents, setRents] = useState<RentRequest[]>([]);
  const [black, setBlack] = useState<{ on: boolean; reason: string }>({ on: false, reason: '' });
  const [reason, setReason] = useState('');
  const [blocking, setBlocking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profiles, customers, ord, rr, bl] = await Promise.all([
        fetchProfiles([id]),
        fetchCustomers().catch(() => [] as Customer[]),
        fetchOrders(id).catch(() => [] as ServerOrder[]),
        fetchRentRequests().catch(() => [] as RentRequest[]),
        fetchBlacklist().catch(() => []),
      ]);
      const prof = profiles[id] ?? null;
      setP(prof);
      setC(customers.find((x) => x.id === id) ?? null);
      setOrders(ord);
      setRents(rr.filter((r) => r.userId === id));
      const b = prof?.phone ? bl.find((x) => x.phone === phone9(prof.phone)) : undefined;
      setBlack({ on: !!b, reason: b?.reason ?? '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Жүктөлгөн жок');
    }
    setLoading(false);
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ката кетти');
    }
  };

  const openDoc = async (path?: string) => {
    const u = await docUrl(path);
    if (u) Linking.openURL(u);
  };

  if (!p && !loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: colors.muted }}>{error ?? 'Кардар табылган жок'}</Text>
      </View>
    );
  }

  const docs: [string, string | undefined][] = p
    ? [
        ['Селфи', p.selfiePath],
        ['Паспорт', p.passportPath],
        ['Айд. күбөлүк', p.licensePath],
      ]
    : [];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <Stack.Screen options={{ title: p?.fullName || 'Кардар' }} />
      {error && <Text style={{ color: colors.danger }}>{error}</Text>}
      {p && (
        <>
          <Card style={{ gap: 8, borderColor: black.on ? colors.danger : colors.border }}>
            <View style={styles.head}>
              <Text style={styles.name}>{p.fullName || 'Аты жазыла элек'}</Text>
              {p.verified && <MaterialCommunityIcons name="shield-check" size={20} color={colors.success} />}
            </View>
            {black.on && <Text style={styles.blackBadge}>⚫ Кара тизмеде{black.reason ? `: ${black.reason}` : ''}</Text>}
            <Row icon="phone" label="Телефон" value={p.phone} onPress={() => tel(p.phone)} />
            <Row icon="email-outline" label="Почта" value={c?.login || p.email} onPress={c?.login ? () => Linking.openURL(`mailto:${c.login}`) : undefined} />
            <Row icon="cake-variant-outline" label="Туулган күнү" value={p.birthDate} />
            <Row icon="home-outline" label="Дареги" value={p.address} />
            <Row icon="card-account-details-outline" label="Паспорт №" value={p.passportNo} />
            {c && <Row icon="calendar-account" label="Катталган" value={new Date(c.createdAt).toLocaleDateString('ru-RU')} />}
          </Card>

          <Card style={{ gap: 10 }}>
            <Text style={styles.h}>Документтер</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {docs.map(([label, path]) => (
                <Pressable key={label} style={{ flex: 1, gap: 4, alignItems: 'center' }} onPress={() => openDoc(path)} disabled={!path}>
                  <View style={styles.docImg}>
                    {path ? <DocImage path={path} style={StyleSheet.absoluteFill} /> : <MaterialCommunityIcons name="image-off-outline" size={24} color={colors.muted} />}
                  </View>
                  <Text style={styles.small}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.head}>
              <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>{p.verified ? 'Документтер текшерилди' : 'Документтерди текшерүү'}</Text>
              <Switch value={p.verified} onValueChange={(v) => run(() => setVerified(p.id, v))} trackColor={{ true: colors.primary, false: colors.border }} />
            </View>
          </Card>

          <Card style={{ gap: 8 }}>
            <Text style={styles.h}>Туугандары</Text>
            {p.relatives.length === 0 && <Text style={styles.small}>Жазыла элек</Text>}
            {p.relatives.map((r, i) => (
              <Row key={i} icon="account-heart-outline" label={r.relation || `Тууганы ${i + 1}`} value={`${r.name} · ${r.phone}`} onPress={() => tel(r.phone)} />
            ))}
          </Card>

          <Text style={styles.h}>Заказдары ({orders.length})</Text>
          {orders.length === 0 && <Text style={styles.small}>Заказ жок</Text>}
          {orders.map((o) => (
            <OrderStatusCard key={o.id} order={o} />
          ))}

          <Text style={styles.h}>Ижаралары ({rents.length})</Text>
          {rents.length === 0 && <Text style={styles.small}>Ижара жок</Text>}
          {rents.map((r) => (
            <Card key={r.id} style={{ gap: 4 }}>
              <View style={styles.head}>
                <Text style={{ flex: 1, fontWeight: '800', color: colors.text }}>{r.bikeName}</Text>
                <Text style={styles.small}>{RENT_LABEL[r.status] ?? r.status}</Text>
              </View>
              <Text style={styles.small}>
                {r.count} {UNIT[r.period]}
                {r.total ? ` · ${formatPrice(r.total)}` : ''} · {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                {r.paidUntil ? ` · төлөнгөн: ${r.paidUntil.slice(0, 10).split('-').reverse().join('.')} чейин` : ''}
              </Text>
            </Card>
          ))}

          <Card style={{ gap: 10 }}>
            <Text style={styles.h}>Кара тизме</Text>
            {!p.phone ? (
              <Text style={styles.small}>Телефону жок — кара тизмеге кошуу үчүн номер керек.</Text>
            ) : black.on ? (
              <Button title="Кара тизмеден чыгаруу" variant="outline" onPress={() => run(() => removeFromBlacklist(p.phone))} />
            ) : blocking ? (
              <>
                <Field label="Себеби" value={reason} onChangeText={setReason} placeholder="Мисалы: 3 жолу отказ кылды" />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button title="Жок" variant="outline" style={{ flex: 1 }} onPress={() => setBlocking(false)} />
                  <Button
                    title="Кара тизмеге"
                    style={{ flex: 1, backgroundColor: colors.danger }}
                    onPress={() =>
                      run(async () => {
                        await addToBlacklist(p.phone, reason);
                        setBlocking(false);
                        setReason('');
                      })
                    }
                  />
                </View>
              </>
            ) : (
              <Pressable onPress={() => setBlocking(true)} hitSlop={6}>
                <Text style={{ color: colors.danger, fontWeight: '700' }}>⚫ Кара тизмеге кошуу</Text>
              </Pressable>
            )}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 20, fontWeight: '900', color: colors.text },
  h: { fontSize: 16, fontWeight: '800', color: colors.text },
  small: { color: colors.muted, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  rowLabel: { color: colors.muted, width: 100, fontSize: 13 },
  rowValue: { flex: 1, color: colors.text, fontWeight: '600', fontSize: 14 },
  docImg: { width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  blackBadge: { color: '#fff', backgroundColor: colors.ink, fontWeight: '800', fontSize: 13, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden', alignSelf: 'flex-start' },
});
