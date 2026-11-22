import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Chip, Field } from '../../components/ui';
import { colors, radius } from '../../config/theme';
import { addToBlacklist, BlackItem, Customer, fetchBlacklist, fetchCustomers, removeFromBlacklist } from '../../lib/orders';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('ru-RU');
const showPhone = (p9: string) => `+996 ${p9.slice(0, 3)} ${p9.slice(3, 6)} ${p9.slice(6)}`;

// Катталган кардарлар жана кара тизме. Кара тизмедеги номерден заказ да, ижара өтүнмөсү да өтпөйт.
export default function AdminCustomers() {
  const [tab, setTab] = useState<'all' | 'black'>('all');
  const [list, setList] = useState<Customer[]>([]);
  const [black, setBlack] = useState<BlackItem[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blocking, setBlocking] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newReason, setNewReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, b] = await Promise.all([fetchCustomers(), fetchBlacklist()]);
      setList(c);
      setBlack(b);
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setError(m.includes('admin_customers') || m.includes('blacklist') ? 'SQL иштетиле элек (015_customers_blacklist.sql).' : m);
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const digits = s.replace(/\D/g, '');
    return list.filter(
      (c) => !s || c.fullName.toLowerCase().includes(s) || c.login.toLowerCase().includes(s) || (digits.length >= 3 && c.phone.replace(/\D/g, '').includes(digits)),
    );
  }, [list, q]);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ката кетти');
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label={`👥 Кардарлар (${list.length})`} active={tab === 'all'} onPress={() => setTab('all')} />
        <Chip label={`⚫ Кара тизме (${black.length})`} active={tab === 'black'} onPress={() => setTab('black')} />
      </View>
      {error && <Text style={{ color: colors.danger }}>{error}</Text>}

      {tab === 'all' ? (
        <>
          <View style={styles.search}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder="Аты, почтасы же телефону" placeholderTextColor={colors.muted} style={styles.searchInput} />
          </View>
          {!loading && shown.length === 0 && <Text style={styles.empty}>Кардар табылган жок</Text>}
          {shown.map((c) => (
            <Card key={c.id} style={[{ gap: 6 }, c.blacklisted && { borderColor: colors.danger }]}>
              <View style={styles.row}>
                <Text style={styles.name}>{c.fullName || 'Аты жазыла элек'}</Text>
                {c.verified && <MaterialCommunityIcons name="shield-check" size={18} color={colors.success} />}
                {c.blacklisted && <Text style={styles.blackBadge}>⚫ Кара тизмеде</Text>}
              </View>
              {!!c.phone && (
                <Pressable onPress={() => Linking.openURL(`tel:${c.phone.replace(/[^\d+]/g, '')}`)} style={styles.row}>
                  <MaterialCommunityIcons name="phone" size={16} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>{c.phone}</Text>
                </Pressable>
              )}
              {!!c.login && <Text style={styles.muted}>✉️ {c.login}</Text>}
              <Text style={styles.muted}>
                Катталган: {fmtDate(c.createdAt)} · Заказ: {c.orders} · Ижара: {c.rents}
              </Text>
              {c.blacklisted && !!c.blacklistReason && <Text style={{ color: colors.danger, fontSize: 13 }}>Себеби: {c.blacklistReason}</Text>}

              {blocking === c.id ? (
                <View style={styles.blockBox}>
                  <Field label="Себеби" value={reason} onChangeText={setReason} placeholder="Мисалы: 3 жолу отказ кылды" />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button title="Жок" variant="outline" style={{ flex: 1 }} onPress={() => setBlocking(null)} />
                    <Button
                      title="Кара тизмеге"
                      style={{ flex: 1, backgroundColor: colors.danger }}
                      onPress={() => run(async () => {
                        await addToBlacklist(c.phone, reason);
                        setBlocking(null);
                        setReason('');
                      })}
                    />
                  </View>
                </View>
              ) : c.blacklisted ? (
                <Pressable onPress={() => run(() => removeFromBlacklist(c.phone))} hitSlop={6}>
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>Кара тизмеден чыгаруу</Text>
                </Pressable>
              ) : c.phone ? (
                <Pressable onPress={() => setBlocking(c.id)} hitSlop={6}>
                  <Text style={{ color: colors.danger, fontWeight: '700' }}>⚫ Кара тизмеге кошуу</Text>
                </Pressable>
              ) : null}
            </Card>
          ))}
        </>
      ) : (
        <>
          <Card style={{ gap: 10 }}>
            <Text style={styles.name}>Номерди кара тизмеге кошуу</Text>
            <Text style={styles.muted}>Аккаунту жок адамдарды да номери боюнча бөгөттөсө болот.</Text>
            <Field label="Телефон" value={newPhone} onChangeText={setNewPhone} placeholder="0700 123 456" keyboardType="phone-pad" />
            <Field label="Себеби" value={newReason} onChangeText={setNewReason} placeholder="Мисалы: товарды алган жок" />
            <Button
              title="Кошуу"
              icon="account-cancel"
              disabled={newPhone.replace(/\D/g, '').length < 9}
              onPress={() => run(async () => {
                await addToBlacklist(newPhone, newReason);
                setNewPhone('');
                setNewReason('');
              })}
            />
          </Card>
          {black.length === 0 && <Text style={styles.empty}>Кара тизме бош</Text>}
          {black.map((b) => (
            <Card key={b.phone} style={[styles.row, { justifyContent: 'space-between' }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.name}>{showPhone(b.phone)}</Text>
                {!!b.reason && <Text style={styles.muted}>{b.reason}</Text>}
                <Text style={styles.muted}>{fmtDate(b.createdAt)}</Text>
              </View>
              <Pressable onPress={() => run(() => removeFromBlacklist(b.phone))} hitSlop={8}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Чыгаруу</Text>
              </Pressable>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 16, fontWeight: '800', color: colors.text },
  muted: { color: colors.muted, fontSize: 13 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 24 },
  blackBadge: { color: '#fff', backgroundColor: colors.ink, fontWeight: '800', fontSize: 12, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  blockBox: { gap: 8, backgroundColor: '#FEF2F2', borderRadius: radius.md, padding: 10 },
});
