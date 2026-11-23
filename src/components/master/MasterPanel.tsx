import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LoginForm } from '../account/LoginForm';
import { SectionTitle } from '../ui';
import { colors, radius } from '../../config/theme';
import { useAccount } from '../../context/AccountContext';
import { TKey, useT } from '../../i18n';
import { useContent } from '../../context/ContentContext';
import { fetchMasterRepairs, fetchRepairs, fmtVisit, myMasterId, Repair, RepairStatus, updateRepair } from '../../lib/repairs';
import { mapLink } from '../../lib/rentRequests';
import { PhotoStrip } from '../repair/PhotoStrip';

const LOGO = require('../../../assets/brand/logo.png');

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
  const apply = async (patch: { status?: RepairStatus; masterNote?: string; arrived?: boolean }) => {
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
      <PhotoStrip photos={r.photos} size={96} />
      {(!!r.problem || r.services.length > 0 || !!r.bike) && (
        <View style={styles.block}>
          <Text style={styles.blockLabel}>❓ {t('mp.what')}</Text>
          {!!r.bike && <Text style={styles.text}>🚲 {r.bike}</Text>}
          {r.services.length > 0 && <Text style={styles.text}>🔧 {r.services.join(', ')}</Text>}
          {!!r.problem && <Text style={styles.text}>💬 {r.problem}</Text>}
        </View>
      )}
      <View style={styles.block}>
        <Text style={styles.blockLabel}>📍 {t('mp.where')}</Text>
        {r.outcall ? (
          <>
            <Text style={[styles.text, { color: colors.primary, fontWeight: '800' }]}>{t('mp.outcall')}</Text>
            {!!r.address && <Text style={[styles.text, { fontWeight: '700' }]}>🏠 {r.address}</Text>}
            {r.lat != null && r.lng != null && (
              <Pressable onPress={() => Linking.openURL(mapLink(r.lat!, r.lng!))} style={styles.mapBtn}>
                <MaterialCommunityIcons name="map-marker-radius" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '800' }}>{t('mp.map')}</Text>
              </Pressable>
            )}
          </>
        ) : (
          <Text style={styles.text}>🏪 {t('mp.atShop')}{r.branch ? `: ${r.branch}` : ''}</Text>
        )}
      </View>
      {r.outcall && mine && (r.status === 'accepted' || r.status === 'in_progress') && !r.arrivedAt && (
        <Pressable disabled={busy} onPress={() => apply({ arrived: true })} style={[styles.action, { backgroundColor: '#2563EB', borderColor: '#2563EB' }]}>
          <Text style={{ color: '#fff', fontWeight: '900' }}>{t('mp.arrived')}</Text>
        </Pressable>
      )}
      {!!r.arrivedAt && <Text style={[styles.text, { color: '#2563EB', fontWeight: '800' }]}>✅ {t('mp.arrivedAt', { v: fmtVisit(r.arrivedAt) })}</Text>}
      {!!r.visitAt && (
        <View style={styles.block}>
          <Text style={styles.blockLabel}>🕘 {t('mp.whenVisit')}</Text>
          <Text style={[styles.text, { fontWeight: '900', fontSize: 16 }]}>{fmtVisit(r.visitAt)}</Text>
        </View>
      )}
      {!!r.bring && (
        <View style={[styles.block, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
          <Text style={[styles.blockLabel, { color: '#92400E' }]}>🧰 {t('mp.bring')}</Text>
          <Text style={[styles.text, { fontWeight: '700' }]}>{r.bring}</Text>
        </View>
      )}

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

function Stat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <View style={[styles.stat, { borderColor: color }]}>
      <Text style={[styles.statN, { color }]}>{n}</Text>
      <Text style={styles.statL}>{label}</Text>
    </View>
  );
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

function Panel() {
  const { t } = useT();
  const { profile, signOut } = useAccount();
  const { masters } = useContent();
  const [masterId, setMasterId] = useState<string | null | undefined>(undefined);
  const [list, setList] = useState<Repair[]>([]);
  const [own, setOwn] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const id = await myMasterId(profile?.id);
    setMasterId(id);
    if (id) {
      const [l, o] = await Promise.all([fetchRepairs().catch(() => []), fetchMasterRepairs(id).catch(() => [])]);
      setList(l);
      setOwn(o);
    }
    setLoading(false);
  }, [profile]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (masterId === undefined) {
    return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;
  }
  if (masterId === null) {
    return (
      <View style={{ padding: 24, alignItems: 'center', gap: 14 }}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="Jorgo" />
        <MaterialCommunityIcons name="account-hard-hat" size={44} color={colors.muted} />
        <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 15, lineHeight: 21 }}>{t('mp.notMaster2')}</Text>
        <Pressable onPress={() => signOut()} style={[styles.action, { borderColor: colors.primary, paddingHorizontal: 18 }]}>
          <Text style={{ color: colors.primary, fontWeight: '800' }}>{t('mp.otherAccount')}</Text>
        </Pressable>
      </View>
    );
  }
  const me = masters.find((m) => m.id === masterId);
  const replace = (n: Repair) => {
    setList((l) => l.map((x) => (x.id === n.id ? n : x)));
    setOwn((l) => (l.some((x) => x.id === n.id) ? l.map((x) => (x.id === n.id ? n : x)) : [n, ...l]));
  };
  // Менин заказдарым — эки булактан бириктирилет
  const byId = new Map<string, Repair>();
  [...own, ...list.filter((r) => r.masterId === masterId)].forEach((r) => byId.set(r.id, r));
  const mine = [...byId.values()].sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  const free = list.filter((r) => !r.masterId);
  const active = mine.filter((r) => r.status !== 'done' && r.status !== 'cancelled');
  const closed = mine.filter((r) => r.status === 'done' || r.status === 'cancelled');
  const done = mine.filter((r) => r.status === 'done');
  const now = new Date();
  const doneAt = (r: Repair) => new Date(r.updatedAt ?? r.createdAt);
  const today = done.filter((r) => sameDay(doneAt(r), now)).length;
  const month = done.filter((r) => {
    const d = doneAt(r);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const rating = me?.rating ?? 0;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <View style={{ alignItems: 'center' }}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="Jorgo" />
      </View>
      <View style={styles.summary}>
        <Text style={{ fontWeight: '900', color: colors.text, fontSize: 16 }}>👷 {me?.name ?? ''}</Text>
        <Text style={styles.muted}>⭐ {rating.toFixed(1)} · {t('mp.stat.today')}: {today} · {t('mp.stat.month')}: {month}</Text>
      </View>

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
      <SectionTitle>{t('mp.myAccount')}</SectionTitle>
      <View style={styles.profile}>
        <View style={styles.photo}>
          {me?.photoUrl ? <Image source={{ uri: me.photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <MaterialCommunityIcons name="account-hard-hat" size={40} color={colors.primary} />}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.meName}>{me?.name ?? profile?.fullName ?? ''}</Text>
          {!!me?.specialty && <Text style={{ color: colors.primary, fontWeight: '600' }}>{me.specialty}</Text>}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            {[1, 2, 3, 4, 5].map((k) => (
              <MaterialCommunityIcons key={k} name={rating >= k ? 'star' : rating >= k - 0.5 ? 'star-half-full' : 'star-outline'} size={18} color="#F59E0B" />
            ))}
            <Text style={{ marginLeft: 4, fontWeight: '800', color: colors.text }}>{rating.toFixed(1)}</Text>
          </View>
          <Text style={styles.muted}>{[me?.branch && `📍 ${me.branch}`, me?.hoursFrom && me?.hoursTo && `🕘 ${me.hoursFrom}–${me.hoursTo}`, profile?.phone && `📞 ${profile.phone}`].filter(Boolean).join(' · ')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
            <Text style={styles.pill}>{me?.active === false ? t('mp.st.hidden') : t('mp.st.active')}</Text>
            <Text style={styles.pill}>{me?.outcall ? t('mp.outcallOn') : t('mp.outcallOff')}</Text>
          </View>
        </View>
      </View>
      <View style={styles.stats}>
        <Stat n={today} label={t('mp.stat.today')} color={colors.success} />
        <Stat n={month} label={t('mp.stat.month')} color={colors.primary} />
        <Stat n={done.length} label={t('mp.stat.total')} color={colors.text} />
        <Stat n={active.length} label={t('mp.stat.active')} color="#D97706" />
      </View>

    </ScrollView>
  );
}

// Мастердин панели: логотип, мастердин аккаунту, статистика, заказдар.
// Кирбесе — мастерлер үчүн кирүү (катталуу жок: аккаунтту админ гана түзөт).
export function MasterPanel() {
  const { t } = useT();
  const { ready, profile } = useAccount();
  if (!ready) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;
  if (!profile) return <LoginForm masterOnly subtitle={t('mp.loginSub')} onDone={() => {}} />;
  return <Panel />;
}

const styles = StyleSheet.create({
  logo: { width: 200, height: 110 },
  profile: { flexDirection: 'row', gap: 14, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border },
  photo: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  meName: { fontSize: 19, fontWeight: '900', color: colors.text },
  pill: { fontSize: 12, fontWeight: '700', color: colors.text, backgroundColor: colors.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { flexGrow: 1, flexBasis: '45%', backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1.5, padding: 12, alignItems: 'center' },
  statN: { fontSize: 26, fontWeight: '900' },
  statL: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, gap: 8, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  num: { fontSize: 16, fontWeight: '900', color: colors.text },
  badge: { color: '#fff', fontWeight: '800', fontSize: 12, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  date: { marginLeft: 'auto', color: colors.muted, fontSize: 12 },
  name: { fontWeight: '700', color: colors.text },
  phone: { color: colors.primary, fontWeight: '700' },
  text: { color: colors.text, fontSize: 14, lineHeight: 20 },
  muted: { color: colors.muted, fontSize: 13 },
  summary: { alignItems: 'center', gap: 2, marginTop: -6 },
  block: { gap: 2, backgroundColor: colors.bg, borderRadius: radius.md, padding: 10, borderWidth: 1, borderColor: colors.border },
  blockLabel: { fontSize: 12, fontWeight: '800', color: colors.muted, textTransform: 'uppercase' },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#2563EB', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginTop: 4 },
  action: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text, backgroundColor: colors.bg },
});
