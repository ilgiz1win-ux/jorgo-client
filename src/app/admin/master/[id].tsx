import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Chip } from '../../../components/ui';
import { colors, radius } from '../../../config/theme';
import { useContent } from '../../../context/ContentContext';
import { fetchHires, fetchMasterAccount, fetchMasterRepairs, MasterHire, openMasterPanel, Repair, RepairStatus, trialDaysLeft } from '../../../lib/repairs';

const LABEL: Record<RepairStatus, string> = { new: 'Жаңы', accepted: 'Кабыл алды', in_progress: 'Иштеп жатат', done: 'Бүттү', cancelled: 'Отказ' };
const COLOR: Record<RepairStatus, string> = { new: '#2563EB', accepted: '#0D9488', in_progress: '#D97706', done: colors.success, cancelled: colors.danger };
const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const DAY = 86400000;

function Stat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <View style={[styles.stat, { borderColor: color }]}>
      <Text style={[styles.statN, { color }]}>{n}</Text>
      <Text style={styles.statL}>{label}</Text>
    </View>
  );
}

function Job({ r }: { r: Repair }) {
  return (
    <Card style={{ gap: 4, borderLeftWidth: 5, borderLeftColor: COLOR[r.status] }}>
      <View style={styles.row}>
        <Text style={{ fontWeight: '900', color: colors.text }}>№{r.number}</Text>
        <Text style={[styles.badge, { backgroundColor: COLOR[r.status] }]}>{LABEL[r.status]}</Text>
        <Text style={{ marginLeft: 'auto', color: colors.muted, fontSize: 12 }}>{fmt(r.createdAt)}</Text>
      </View>
      <Pressable style={styles.row} onPress={() => Linking.openURL(`tel:${r.phone.replace(/[^\d+]/g, '')}`)}>
        <Text style={{ color: colors.text, fontWeight: '700' }}>{r.name}</Text>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>{r.phone}</Text>
      </Pressable>
      {!!r.bike && <Text style={styles.text}>🚲 {r.bike}</Text>}
      {r.services.length > 0 && <Text style={styles.text}>🔧 {r.services.join(', ')}</Text>}
      {!!r.problem && <Text style={styles.text}>💬 {r.problem}</Text>}
      {r.outcall && <Text style={[styles.text, { color: colors.primary, fontWeight: '800' }]}>🚗 Выезд — кардардын жанына барат</Text>}
      {!!r.masterNote && <Text style={{ color: colors.muted, fontSize: 13 }}>📝 {r.masterNote}</Text>}
    </Card>
  );
}

// Админ: мастердин аккаунту — канча заказ, азыр кайсы заказда, тарыхы
export default function AdminMasterAccount() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { masters } = useContent();
  const m = masters.find((x) => x.id === id);
  const [list, setList] = useState<Repair[]>([]);
  const [account, setAccount] = useState<{ login: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<RepairStatus | 'all'>('all');
  const [hire, setHire] = useState<MasterHire | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const toggle = async (open: boolean) => {
    if (!id) return;
    setBusy(true);
    try {
      await openMasterPanel(id, open);
      setConfirmOpen(false);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes('admin_open_master_panel') ? 'SQL иштетиле элек (018).' : msg);
    }
    setBusy(false);
  };

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [l, a, h] = await Promise.all([fetchMasterRepairs(id), fetchMasterAccount(id), fetchHires()]);
      setList(l);
      setAccount(a);
      setHire(h[id] ?? null);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes('repair_requests') ? 'SQL иштетиле элек (016).' : msg);
    }
    setLoading(false);
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const count = (s: RepairStatus) => list.filter((r) => r.status === s).length;
  const active = list.filter((r) => r.status === 'accepted' || r.status === 'in_progress');
  const now = Date.now();
  const doneMonth = list.filter((r) => r.status === 'done' && now - new Date(r.createdAt).getTime() < 30 * DAY).length;
  const doneWeek = list.filter((r) => r.status === 'done' && now - new Date(r.createdAt).getTime() < 7 * DAY).length;
  const outcalls = list.filter((r) => r.outcall && r.status === 'done').length;
  const closed = count('done') + count('cancelled');
  const successPct = closed ? Math.round((count('done') / closed) * 100) : null;
  const history = list.filter((r) => !active.includes(r) && (filter === 'all' || r.status === filter));

  if (!m) return <Text style={{ padding: 16, color: colors.muted }}>Мастер табылган жок</Text>;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <Stack.Screen options={{ title: m.name }} />
      <Card style={[styles.row, { gap: 12, flexWrap: 'nowrap' }]}>
        <View style={styles.thumb}>
          {m.photoUrl ? <Image source={{ uri: m.photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <MaterialCommunityIcons name="account-hard-hat" size={34} color={colors.primary} />}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontWeight: '900', fontSize: 18, color: colors.text }}>{m.name}</Text>
          {!!m.specialty && <Text style={{ color: colors.primary }}>{m.specialty}</Text>}
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {[`⭐ ${m.rating.toFixed(1)}`, m.branch && `📍 ${m.branch}`, m.hoursFrom && m.hoursTo && `🕘 ${m.hoursFrom}–${m.hoursTo}`].filter(Boolean).join(' · ')}
          </Text>
          {m.outcall && <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>🚗 Выезд{m.outcallNote ? `: ${m.outcallNote}` : ''}</Text>}
          {account ? (
            <Pressable onPress={() => Linking.openURL(`tel:${account.login.replace(/[^\d+]/g, '')}`)}>
              <Text style={{ color: colors.success, fontSize: 13, fontWeight: '700' }}>🔑 Аккаунт: {account.login}{account.name ? ` (${account.name})` : ''}</Text>
            </Pressable>
          ) : (
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '700' }}>🔑 Аккаунт байлана элек — «Мастерлер» бөлүмүнөн байлаңыз</Text>
          )}
        </View>
      </Card>
      {error && <Text style={{ color: colors.danger }}>{error}</Text>}

      {hire && (
        <Card style={[{ gap: 6, borderWidth: 1.5 }, { borderColor: hire.panelOpen ? colors.success : '#D97706' }]}>
          {hire.panelOpen ? (
            <Text style={{ fontWeight: '900', color: colors.success, fontSize: 15 }}>🔓 Мастер панели ачык · выездге чыгат</Text>
          ) : (
            <Text style={{ fontWeight: '900', color: '#B45309', fontSize: 15 }}>
              🧪 Сынак мөөнөтү: точкада иштейт ·{' '}
              {trialDaysLeft(hire.trialUntil) > 0 ? `${trialDaysLeft(hire.trialUntil)} күн калды` : 'мөөнөт бүттү ✅'}
            </Text>
          )}
          <Text style={styles.text}>📅 Ишке алынган: {new Date(hire.hiredAt).toLocaleDateString('ru-RU')} · сынак {new Date(hire.trialUntil + 'T00:00:00').toLocaleDateString('ru-RU')} чейин</Text>
          <View style={styles.cred}>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>🔒 Админдер гана көрөт</Text>
            <Text selectable style={styles.text}>Логин: <Text style={{ fontWeight: '800' }}>{hire.login}</Text></Text>
            {hire.password ? (
              <Pressable onPress={() => setShowPass(!showPass)}>
                <Text selectable style={styles.text}>
                  Сырсөз: <Text style={{ fontWeight: '800' }}>{showPass ? hire.password : '••••••••'}</Text>  <Text style={{ color: colors.primary }}>{showPass ? 'жашыруу' : 'көрсөтүү'}</Text>
                </Text>
              </Pressable>
            ) : (
              <Text style={{ color: colors.muted, fontSize: 13 }}>Аккаунт мурда түзүлгөн — сырсөзү бул жерде сакталган эмес.</Text>
            )}
          </View>
          {!hire.panelOpen &&
            (confirmOpen ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.text}>Мастерге логин-сырсөзүн берип, панелди ачасызбы? Ал заказдарды көрүп, выездге чыга баштайт.</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable style={[styles.btn, { borderColor: colors.muted }]} onPress={() => setConfirmOpen(false)}>
                    <Text style={{ fontWeight: '800', color: colors.muted }}>Жок</Text>
                  </Pressable>
                  <Pressable style={[styles.btn, { backgroundColor: colors.success, borderColor: colors.success, flex: 1 }]} disabled={busy} onPress={() => toggle(true)}>
                    <Text style={{ fontWeight: '800', color: '#fff' }}>Ооба, панелди ачуу</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={[styles.btn, { backgroundColor: colors.success, borderColor: colors.success }]} onPress={() => setConfirmOpen(true)}>
                <Text style={{ fontWeight: '800', color: '#fff' }}>🔓 Панелди ачуу жана выездге чыгаруу</Text>
              </Pressable>
            ))}
          {hire.panelOpen && (
            <Pressable style={[styles.btn, { borderColor: colors.danger }]} disabled={busy} onPress={() => toggle(false)}>
              <Text style={{ fontWeight: '800', color: colors.danger }}>🔒 Панелди кайра жабуу</Text>
            </Pressable>
          )}
        </Card>
      )}

      <View style={styles.stats}>
        <Stat n={list.length} label="Бардык заказ" color={colors.text} />
        <Stat n={count('done')} label="Бүткөргөн" color={colors.success} />
        <Stat n={active.length} label="Азыр иштеп жатат" color="#D97706" />
        <Stat n={count('cancelled')} label="Отказ" color={colors.danger} />
      </View>
      <Card style={{ gap: 4 }}>
        <Text style={styles.text}>📅 Акыркы 7 күндө бүттү: <Text style={{ fontWeight: '800' }}>{doneWeek}</Text></Text>
        <Text style={styles.text}>🗓 Акыркы 30 күндө бүттү: <Text style={{ fontWeight: '800' }}>{doneMonth}</Text></Text>
        <Text style={styles.text}>🚗 Выездге чыгып бүткөргөнү: <Text style={{ fontWeight: '800' }}>{outcalls}</Text></Text>
        {successPct !== null && <Text style={styles.text}>✅ Ийгиликтүү бүткөнү: <Text style={{ fontWeight: '800' }}>{successPct}%</Text></Text>}
        {count('new') > 0 && <Text style={[styles.text, { color: '#2563EB', fontWeight: '700' }]}>🆕 Кабыл ала элек жаңы заказ: {count('new')}</Text>}
      </Card>

      <Text style={styles.h}>🛠 Азыр кайсы заказда ({active.length})</Text>
      {active.length === 0 ? <Text style={styles.empty}>Азыр иштеп жаткан заказы жок</Text> : active.map((r) => <Job key={r.id} r={r} />)}

      <Text style={styles.h}>Тарых</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {(['all', 'new', 'done', 'cancelled'] as const).map((f) => (
          <Chip key={f} label={f === 'all' ? 'Баары' : `${LABEL[f]} (${count(f)})`} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </ScrollView>
      {history.length === 0 ? <Text style={styles.empty}>Жок</Text> : history.slice(0, 50).map((r) => <Job key={r.id} r={r} />)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  thumb: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { flexGrow: 1, flexBasis: '45%', backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1.5, padding: 12, alignItems: 'center' },
  statN: { fontSize: 26, fontWeight: '900' },
  statL: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  badge: { color: '#fff', fontWeight: '800', fontSize: 12, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  h: { fontSize: 17, fontWeight: '900', color: colors.text, marginTop: 4 },
  text: { color: colors.text, fontSize: 14 },
  cred: { gap: 2, backgroundColor: colors.bg, borderRadius: radius.md, padding: 10, borderWidth: 1, borderColor: colors.border },
  btn: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 12 },
});
