import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Chip } from '../../components/ui';
import { colors, radius } from '../../config/theme';
import { useContent } from '../../context/ContentContext';
import { fetchRepairs, Repair, RepairStatus, updateRepair } from '../../lib/repairs';

const LABEL: Record<RepairStatus, string> = { new: 'Жаңы', accepted: 'Кабыл алынды', in_progress: 'Иштелүүдө', done: 'Бүттү', cancelled: 'Отказ' };
const COLOR: Record<RepairStatus, string> = { new: '#2563EB', accepted: '#0D9488', in_progress: '#D97706', done: colors.success, cancelled: colors.danger };
const FILTERS: (RepairStatus | 'all')[] = ['new', 'accepted', 'in_progress', 'done', 'cancelled', 'all'];
const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Бардык оңдоо өтүнмөлөрү: кайсы мастерге түштү, абалы. Админ мастерди өзү да дайындай алат.
export default function AdminRepairs() {
  const { masters } = useContent();
  const [list, setList] = useState<Repair[]>([]);
  const [filter, setFilter] = useState<RepairStatus | 'all'>('new');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setList(await fetchRepairs());
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setError(m.includes('repair_requests') ? 'SQL иштетиле элек (016).' : m);
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const apply = async (id: string, patch: { status?: RepairStatus; masterId?: string | null }) => {
    try {
      const n = await updateRepair(id, patch);
      if (n) setList((l) => l.map((x) => (x.id === n.id ? n : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ката кетти');
    }
  };

  const shown = filter === 'all' ? list : list.filter((r) => r.status === filter);
  const count = (s: RepairStatus) => list.filter((r) => r.status === s).length;
  const masterName = (id?: string) => masters.find((m) => m.id === id)?.name;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {FILTERS.map((f) => (
          <Chip key={f} label={f === 'all' ? `Баары (${list.length})` : `${LABEL[f]} (${count(f)})`} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </ScrollView>
      {error && <Text style={{ color: colors.danger }}>{error}</Text>}
      {!loading && !error && shown.length === 0 && <Text style={styles.empty}>Өтүнмө жок. Ылдый тартып жаңыртыңыз.</Text>}
      {shown.map((r) => (
        <Card key={r.id} style={{ gap: 6, borderLeftWidth: 5, borderLeftColor: COLOR[r.status] }}>
          <View style={styles.row}>
            <Text style={styles.num}>№{r.number}</Text>
            <Text style={[styles.badge, { backgroundColor: COLOR[r.status] }]}>{LABEL[r.status]}</Text>
            <Text style={styles.date}>{fmt(r.createdAt)}</Text>
          </View>
          <Pressable style={styles.row} onPress={() => Linking.openURL(`tel:${r.phone.replace(/[^\d+]/g, '')}`)}>
            <MaterialCommunityIcons name="phone" size={16} color={colors.primary} />
            <Text style={{ color: colors.text, fontWeight: '700' }}>{r.name}</Text>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{r.phone}</Text>
          </Pressable>
          {!!r.bike && <Text style={styles.text}>🚲 {r.bike}</Text>}
          {r.services.length > 0 && <Text style={styles.text}>🔧 {r.services.join(', ')}</Text>}
          {!!r.problem && <Text style={styles.text}>💬 {r.problem}</Text>}
          {r.outcall && <Text style={[styles.text, { color: colors.primary, fontWeight: '800' }]}>🚗 Выезд керек</Text>}
          <Text style={styles.muted}>
            📍 {r.branch || '—'} · 👷 {masterName(r.masterId) ?? 'мастер тандала элек'}
          </Text>
          {!!r.masterNote && <Text style={styles.muted}>📝 {r.masterNote}</Text>}

          {assigning === r.id ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {masters
                .filter((m) => m.active)
                .map((m) => (
                  <Chip
                    key={m.id}
                    label={`${m.name}${m.branch ? ` · ${m.branch}` : ''}`}
                    active={r.masterId === m.id}
                    onPress={() => {
                      apply(r.id, { masterId: m.id });
                      setAssigning(null);
                    }}
                  />
                ))}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Pressable onPress={() => setAssigning(r.id)} style={[styles.action, { borderColor: '#B45309' }]}>
                <Text style={{ color: '#B45309', fontWeight: '800', fontSize: 13 }}>👷 Мастер дайындоо</Text>
              </Pressable>
              {r.status !== 'cancelled' && r.status !== 'done' && (
                <Pressable onPress={() => apply(r.id, { status: 'cancelled' })} style={[styles.action, { borderColor: colors.danger }]}>
                  <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 13 }}>Отказ</Text>
                </Pressable>
              )}
            </View>
          )}
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  num: { fontSize: 16, fontWeight: '900', color: colors.text },
  badge: { color: '#fff', fontWeight: '800', fontSize: 12, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  date: { marginLeft: 'auto', color: colors.muted, fontSize: 12 },
  text: { color: colors.text, fontSize: 14 },
  muted: { color: colors.muted, fontSize: 13 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 24 },
  action: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 7 },
});
