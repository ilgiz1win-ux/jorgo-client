import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RequireAccount } from '../components/account/RequireAccount';
import { SectionTitle } from '../components/ui';
import { colors, radius } from '../config/theme';
import { useAccount } from '../context/AccountContext';
import { TKey, useT } from '../i18n';
import { fetchRepairs, myMasterId, Repair, RepairStatus, updateRepair } from '../lib/repairs';

const COLOR: Record<RepairStatus, string> = { new: '#2563EB', accepted: '#0D9488', in_progress: '#D97706', done: colors.success, cancelled: colors.danger };
const NEXT: Record<RepairStatus, RepairStatus[]> = {
  new: ['accepted', 'cancelled'],
  accepted: ['in_progress', 'done', 'cancelled'],
  in_progress: ['done', 'cancelled'],
  done: [],
  cancelled: [],
};
const ACTION: Record<RepairStatus, TKey> = { new: 'mp.status.new', accepted: 'mp.accept', in_progress: 'mp.progress', done: 'mp.done', cancelled: 'mp.cancel' };
const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function RepairCard({ r, mine, onChange, onTake }: { r: Repair; mine: boolean; onChange: (n: Repair) => void; onTake: () => void }) {
  const { t } = useT();
  const [note, setNote] = useState(r.masterNote);
  const [busy, setBusy] = useState(false);
  const apply = async (patch: { status?: RepairStatus; masterNote?: string }) => {
    setBusy(true);
    try {
      const n = await updateRepair(r.id, patch);
      if (n) onChange(n);
    } catch {
      // байланыш жок — кийин кайра
    }
    setBusy(false);
  };
  return (
    <View style={[styles.card, { borderLeftColor: COLOR[r.status] }]}>
      <View style={styles.row}>
        <Text style={styles.num}>№{r.number}</Text>
        <Text style={[styles.badge, { backgroundColor: COLOR[r.status] }]}>{t(`mp.status.${r.status}` as TKey)}</Text>
        <Text style={styles.date}>{fmt(r.createdAt)}</Text>
      </View>
      <Pressable style={styles.row} onPress={() => Linking.openURL(`tel:${r.phone.replace(/[^\d+]/g, '')}`)}>
        <MaterialCommunityIcons name="account" size={18} color={colors.muted} />
        <Text style={styles.name}>{r.name}</Text>
        <MaterialCommunityIcons name="phone" size={18} color={colors.primary} />
        <Text style={styles.phone}>{r.phone}</Text>
      </Pressable>
      {!!r.bike && <Text style={styles.text}>🚲 {r.bike}</Text>}
      {r.services.length > 0 && <Text style={styles.text}>🔧 {r.services.join(', ')}</Text>}
      {!!r.problem && <Text style={styles.text}>💬 {r.problem}</Text>}
      {r.outcall && <Text style={[styles.text, { color: colors.primary, fontWeight: '800' }]}>{t('mp.outcall')}</Text>}
      {!!r.branch && <Text style={styles.muted}>📍 {r.branch}</Text>}

      {!mine ? (
        <Pressable disabled={busy} onPress={onTake} style={[styles.action, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>✋ {t('mp.take')}</Text>
        </Pressable>
      ) : (
        <>
          {NEXT[r.status].length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {NEXT[r.status].map((s) => (
                <Pressable key={s} disabled={busy} onPress={() => apply({ status: s })} style={[styles.action, { borderColor: COLOR[s] }]}>
                  <Text style={{ color: COLOR[s], fontWeight: '800' }}>{t(ACTION[s])}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {r.status !== 'done' && r.status !== 'cancelled' && (
            <View style={{ gap: 6 }}>
              <TextInput value={note} onChangeText={setNote} placeholder={t('mp.note')} placeholderTextColor={colors.muted} style={styles.input} />
              {note.trim() !== r.masterNote && (
                <Pressable disabled={busy} onPress={() => apply({ masterNote: note.trim() })} style={[styles.action, { borderColor: colors.primary, alignSelf: 'flex-start' }]}>
                  <Text style={{ color: colors.primary, fontWeight: '800' }}>{t('mp.saveNote')}</Text>
                </Pressable>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

function Panel() {
  const { t } = useT();
  const { profile } = useAccount();
  const [masterId, setMasterId] = useState<string | null | undefined>(undefined);
  const [list, setList] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const id = await myMasterId(profile?.id);
    setMasterId(id);
    if (id) setList(await fetchRepairs().catch(() => []));
    setLoading(false);
  }, [profile]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (masterId === null) {
    return (
      <View style={{ padding: 24, alignItems: 'center', gap: 10 }}>
        <MaterialCommunityIcons name="account-hard-hat" size={44} color={colors.muted} />
        <Text style={{ color: colors.muted, textAlign: 'center' }}>{t('mp.notMaster')}</Text>
      </View>
    );
  }
  const mine = list.filter((r) => r.masterId === masterId);
  const free = list.filter((r) => !r.masterId);
  const active = mine.filter((r) => r.status !== 'done' && r.status !== 'cancelled');
  const closed = mine.filter((r) => r.status === 'done' || r.status === 'cancelled');
  const replace = (n: Repair) => setList((l) => l.map((x) => (x.id === n.id ? n : x)));

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      {free.length > 0 && <SectionTitle>{`${t('mp.free')} (${free.length})`}</SectionTitle>}
      {free.map((r) => (
        <RepairCard
          key={r.id}
          r={r}
          mine={false}
          onChange={replace}
          onTake={() => masterId && updateRepair(r.id, { masterId, status: 'accepted' }).then((n) => n && replace(n)).catch(() => load())}
        />
      ))}
      <SectionTitle>{`${t('mp.mine')} (${active.length})`}</SectionTitle>
      {!loading && active.length === 0 && <Text style={styles.muted}>{t('mp.empty')}</Text>}
      {active.map((r) => (
        <RepairCard key={r.id} r={r} mine onChange={replace} onTake={() => {}} />
      ))}
      {closed.length > 0 && <SectionTitle>{`${t('mp.status.done')} / ${t('mp.status.cancelled')} (${closed.length})`}</SectionTitle>}
      {closed.slice(0, 20).map((r) => (
        <RepairCard key={r.id} r={r} mine onChange={replace} onTake={() => {}} />
      ))}
    </ScrollView>
  );
}

// Мастердин панели: ага түшкөн оңдоо заказдары жана точкасындагы бош заказдар
export default function MasterPanel() {
  return (
    <RequireAccount next="/master-panel">
      <Panel />
    </RequireAccount>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, gap: 8, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  num: { fontSize: 16, fontWeight: '900', color: colors.text },
  badge: { color: '#fff', fontWeight: '800', fontSize: 12, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  date: { marginLeft: 'auto', color: colors.muted, fontSize: 12 },
  name: { fontWeight: '700', color: colors.text },
  phone: { color: colors.primary, fontWeight: '700' },
  text: { color: colors.text, fontSize: 14, lineHeight: 20 },
  muted: { color: colors.muted, fontSize: 13 },
  action: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text, backgroundColor: colors.bg },
});
