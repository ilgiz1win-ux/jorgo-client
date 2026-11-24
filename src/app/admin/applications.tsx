import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Field } from '../../components/ui';
import { colors, radius } from '../../config/theme';
import { useContent } from '../../context/ContentContext';
import { newId } from '../../lib/catalogApi';
import { AppStatus, createMasterLogin, fetchApplications, genPassword, hireMaster, MasterApplication, setApplicationStatus } from '../../lib/repairs';

const LABEL: Record<AppStatus, string> = { new: 'Жаңы', contacted: 'Байланыштык', hired: 'Ишке алынды', rejected: 'Четке кагылды' };
const COLOR: Record<AppStatus, string> = { new: '#2563EB', contacted: '#D97706', hired: colors.success, rejected: colors.danger };

type Done = { login: string; password: string | null; until: string; masterId: string };

// Ишке алуу формасы: точка, сынак мөөнөтү, мастердин аккаунту (логин/сырсөз админде гана)
function HireForm({ a, onDone, onCancel }: { a: MasterApplication; onDone: (d: Done) => void; onCancel: () => void }) {
  const { branches, saveMaster } = useContent();
  const [branch, setBranch] = useState(a.branch || branches[0]?.name || '');
  const [days, setDays] = useState('30');
  const [password, setPassword] = useState(genPassword());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const phone9 = a.phone.replace(/\D/g, '').slice(-9);

  const hire = async () => {
    setBusy(true);
    setError(null);
    try {
      const trialDays = Math.max(0, parseInt(days.replace(/\D/g, ''), 10) || 30);
      // 1) аккаунт (номер мурунтан катталган болсо — ошол аккаунт колдонулат)
      const res = await createMasterLogin(phone9, password, a.name.trim());
      if (res === 'error') throw new Error('Аккаунт түзүлгөн жок. Интернетти текшерип, кайра аракет кылыңыз.');
      // 2) мастер (точкада иштейт, выезд азырынча жок)
      const masterId = newId('master');
      await saveMaster({
        id: masterId,
        name: a.name.trim(),
        specialty: a.specialty.trim(),
        experience: a.experience.trim(),
        branch,
        active: true,
        rating: 5,
        orders: 0,
        hoursFrom: '09:00',
        hoursTo: '18:00',
        outcall: false,
        outcallNote: '',
      });
      // 3) байлоо: панел сынак айы бүткөнчө жабык
      const pass = res === 'exists' ? null : password;
      const ok = await hireMaster({ appId: a.id, masterId, phone9, password: pass, trialDays });
      if (!ok) throw new Error('Аккаунт табылган жок.');
      const until = new Date(Date.now() + trialDays * 86400000);
      onDone({ login: `+996 ${phone9.slice(0, 3)} ${phone9.slice(3, 6)} ${phone9.slice(6)}`, password: pass, until: until.toLocaleDateString('ru-RU'), masterId });
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setError(m.includes('admin_hire_master') || m.includes('master_hires') ? 'SQL иштетиле элек (018).' : m);
    }
    setBusy(false);
  };

  return (
    <View style={styles.form}>
      <Text style={styles.formTitle}>✅ Ишке алуу</Text>
      <Text style={styles.muted}>Мастер алгач точкада сынак мөөнөтүндө иштейт. Мөөнөт бүткөндө сизге билдирме келет — анан логин-сырсөзүн берип, мастер панелин ачасыз жана ал выездге чыга баштайт.</Text>
      <Text style={styles.label}>Кайсы точкада иштейт</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {branches.map(({ name }) => (
          <Chip key={name} label={`📍 ${name}`} active={branch === name} onPress={() => setBranch(name)} />
        ))}
      </View>
      <Field label="Сынак мөөнөтү (күн)" value={days} onChangeText={setDays} keyboardType="number-pad" placeholder="30" />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Field label={`Логин: +996 ${phone9} · Сырсөз`} value={password} onChangeText={setPassword} autoCapitalize="none" />
        </View>
        <Pressable onPress={() => setPassword(genPassword())} style={styles.regen} accessibilityLabel="Жаңы сырсөз">
          <MaterialCommunityIcons name="refresh" size={22} color={colors.primary} />
        </Pressable>
      </View>
      <Text style={styles.muted}>🔒 Логин менен сырсөздү админдер гана көрөт. Мастерге сынак айы бүткөндөн кийин бересиз.</Text>
      {error && <Text style={{ color: colors.danger }}>{error}</Text>}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="Жокко чыгаруу" variant="outline" style={{ flex: 1 }} onPress={onCancel} />
        <Button title="Ишке алуу" icon="account-check" style={{ flex: 1 }} disabled={busy || password.length < 6 || phone9.length < 9 || !branch} onPress={hire} />
      </View>
    </View>
  );
}

// «Мастер болом» деген өтүнмөлөр
export default function AdminApplications() {
  const [list, setList] = useState<MasterApplication[]>([]);
  const [filter, setFilter] = useState<AppStatus | 'all'>('new');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hiring, setHiring] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, Done>>({});

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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {(['new', 'contacted', 'hired', 'rejected', 'all'] as const).map((f) => (
            <Chip key={f} label={f === 'all' ? `Баары (${list.length})` : `${LABEL[f]} (${list.filter((a) => a.status === f).length})`} active={filter === f} onPress={() => setFilter(f)} />
          ))}
        </ScrollView>
        {error && <Text style={{ color: colors.danger }}>{error}</Text>}
        {!loading && !error && shown.length === 0 && <Text style={styles.empty}>Өтүнмө жок</Text>}
        {shown.map((a) => {
          const d = done[a.id];
          return (
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

              {d && (
                <View style={styles.result}>
                  <Text style={{ fontWeight: '800', color: colors.text }}>Ишке алынды ✅ Аккаунт даяр (мастерге азырынча бербеңиз)</Text>
                  <Text selectable style={styles.text}>Логин: {d.login}</Text>
                  <Text selectable style={styles.text}>{d.password ? `Сырсөз: ${d.password}` : 'Бул номерге мастер аккаунту мурда түзүлгөн — сырсөзү мурдагыдай.'}</Text>
                  <Text style={styles.muted}>Сынак {d.until} чейин. Анан «Мастердин аккаунту» бөлүмүнөн панелди ачасыз.</Text>
                </View>
              )}

              {hiring === a.id ? (
                <HireForm
                  a={a}
                  onCancel={() => setHiring(null)}
                  onDone={(r) => {
                    setDone((x) => ({ ...x, [a.id]: r }));
                    setList((l) => l.map((x) => (x.id === a.id ? { ...x, status: 'hired', masterId: r.masterId } : x)));
                    setHiring(null);
                    setFilter('hired');
                  }}
                />
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {a.status === 'hired' && (a.masterId || d) ? (
                    <Pressable onPress={() => router.push({ pathname: '/admin/master/[id]', params: { id: a.masterId ?? d!.masterId } })} style={[styles.action, { borderColor: colors.success, backgroundColor: colors.success }]}>
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>👷 Мастердин аккаунту</Text>
                    </Pressable>
                  ) : (
                    a.status !== 'hired' && (
                      <Pressable onPress={() => setHiring(a.id)} style={[styles.action, { borderColor: colors.success, backgroundColor: colors.success }]}>
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>✅ Ишке алуу</Text>
                      </Pressable>
                    )
                  )}
                  {(['contacted', 'rejected'] as AppStatus[])
                    .filter((s) => s !== a.status && a.status !== 'hired')
                    .map((s) => (
                      <Pressable key={s} onPress={() => change(a.id, s)} style={[styles.action, { borderColor: COLOR[s] }]}>
                        <Text style={{ color: COLOR[s], fontWeight: '800', fontSize: 13 }}>{LABEL[s]}</Text>
                      </Pressable>
                    ))}
                </View>
              )}
            </Card>
          );
        })}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
  badge: { color: '#fff', fontWeight: '800', fontSize: 12, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  text: { color: colors.text, fontSize: 14 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 24 },
  action: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 7 },
  form: { gap: 10, backgroundColor: colors.bg, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.success, marginTop: 4 },
  formTitle: { fontSize: 16, fontWeight: '900', color: colors.success },
  regen: { width: 48, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  result: { gap: 4, backgroundColor: '#ECFDF5', borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.success },
});
