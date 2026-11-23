import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Chip } from '../../components/ui';
import { colors, radius } from '../../config/theme';
import { AppStatus, fetchApplications, MasterApplication, setApplicationStatus } from '../../lib/repairs';

const LABEL: Record<AppStatus, string> = { new: 'Жаңы', contacted: 'Байланыштык', hired: 'Ишке алынды', rejected: 'Четке кагылды' };
const COLOR: Record<AppStatus, string> = { new: '#2563EB', contacted: '#D97706', hired: colors.success, rejected: colors.danger };

// «Мастер болом» деген өтүнмөлөр
export default function AdminApplications() {
  const [list, setList] = useState<MasterApplication[]>([]);
  const [filter, setFilter] = useState<AppStatus | 'all'>('new');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setList(await fetchApplications());
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setError(m.includes('master_applications') ? 'SQL иштетиле элек (016).' : m);
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const change = async (id: string, status: AppStatus) => {
    try {
      await setApplicationStatus(id, status);
      setList((l) => l.map((a) => (a.id === id ? { ...a, status } : a)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ката кетти');
    }
  };
  const shown = filter === 'all' ? list : list.filter((a) => a.status === filter);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {(['new', 'contacted', 'hired', 'rejected', 'all'] as const).map((f) => (
          <Chip key={f} label={f === 'all' ? `Баары (${list.length})` : `${LABEL[f]} (${list.filter((a) => a.status === f).length})`} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </ScrollView>
      {error && <Text style={{ color: colors.danger }}>{error}</Text>}
      {!loading && !error && shown.length === 0 && <Text style={styles.empty}>Өтүнмө жок</Text>}
      {shown.map((a) => (
        <Card key={a.id} style={{ gap: 6 }}>
          <View style={styles.row}>
            <Text style={styles.name}>{a.name}</Text>
            <Text style={[styles.badge, { backgroundColor: COLOR[a.status] }]}>{LABEL[a.status]}</Text>
          </View>
          <Pressable style={styles.row} onPress={() => Linking.openURL(`tel:${a.phone.replace(/[^\d+]/g, '')}`)}>
            <MaterialCommunityIcons name="phone" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{a.phone}</Text>
          </Pressable>
          {!!a.experience && <Text style={styles.text}>🏅 Тажрыйбасы: {a.experience}</Text>}
          {!!a.specialty && <Text style={styles.text}>🔧 {a.specialty}</Text>}
          {!!a.branch && <Text style={styles.text}>📍 {a.branch}</Text>}
          {!!a.comment && <Text style={styles.text}>💬 {a.comment}</Text>}
          <Text style={styles.muted}>{new Date(a.createdAt).toLocaleString('ru-RU')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(['contacted', 'hired', 'rejected'] as AppStatus[])
              .filter((s) => s !== a.status)
              .map((s) => (
                <Pressable key={s} onPress={() => change(a.id, s)} style={[styles.action, { borderColor: COLOR[s] }]}>
                  <Text style={{ color: COLOR[s], fontWeight: '800', fontSize: 13 }}>{LABEL[s]}</Text>
                </Pressable>
              ))}
          </View>
        </Card>
      ))}
      <Text style={styles.muted}>Ишке алсаңыз: «Мастерлер» бөлүмүнө мастерди кошуп, анын телефонун аккаунтка байлаңыз — ошондо ал мастер панелине кире алат.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
  badge: { color: '#fff', fontWeight: '800', fontSize: 12, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  text: { color: colors.text, fontSize: 14 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 24 },
  action: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 7 },
});
