import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ComponentProps, useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { DocImage } from '../../components/account/DocImage';
import { Card, Chip } from '../../components/ui';
import { colors, radius } from '../../config/theme';
import type { RentPeriod } from '../../data/rentals';
import { formatPrice } from '../../lib/format';
import { docUrl, fetchProfiles, Profile, setVerified } from '../../lib/account';
import { fetchRentRequests, mapLink, RentRequest, RentStatus, setRentStatus } from '../../lib/rentRequests';

const STATUS: Record<RentStatus, { label: string; color: string }> = {
  new: { label: 'Жаңы', color: '#2563EB' },
  active: { label: 'Ижарада', color: '#2E7D32' },
  returned: { label: 'Кайтарылды', color: '#64748B' },
  rejected: { label: 'Четке кагылды', color: '#DC2626' },
};
const FILTERS: (RentStatus | 'all')[] = ['new', 'active', 'returned', 'rejected', 'all'];
const UNIT: Record<RentPeriod, string> = { day: 'күн', week: 'жума', month: 'ай' };

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function Row({ icon, label, value, onPress }: { icon: ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; value: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.row}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.muted} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, onPress && { color: colors.primary, textDecorationLine: 'underline' }]} selectable>
        {value}
      </Text>
    </Pressable>
  );
}

// Кардардын аккаунтундагы документтер (басса, толук сүрөт ачылат)
function CustomerDocs({ p, onVerify }: { p: Profile; onVerify: (v: boolean) => void }) {
  const docs: [string, string | undefined][] = [
    ['Селфи', p.selfiePath],
    ['Паспорт', p.passportPath],
    ['Айд. күбөлүк', p.licensePath],
  ];
  const open = async (path?: string) => {
    const u = await docUrl(path);
    if (u) Linking.openURL(u);
  };
  return (
    <View style={styles.docsBox}>
      <View style={styles.docs}>
        {docs.map(([label, path]) => (
          <Pressable key={label} style={styles.doc} onPress={() => open(path)} disabled={!path}>
            <View style={styles.docImg}>
              {path ? <DocImage path={path} style={StyleSheet.absoluteFill} /> : <MaterialCommunityIcons name="image-off-outline" size={22} color={colors.muted} />}
            </View>
            <Text style={styles.docLabel}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.verifyRow}>
        <MaterialCommunityIcons name={p.verified ? 'shield-check' : 'shield-outline'} size={18} color={p.verified ? colors.success : colors.muted} />
        <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>{p.verified ? 'Документтер текшерилди' : 'Документтерди текшерүү'}</Text>
        <Switch value={p.verified} onValueChange={onVerify} trackColor={{ true: colors.primary, false: colors.border }} />
      </View>
      {p.relatives.map((r, i) => (
        <Row
          key={i}
          icon="account-heart-outline"
          label={r.relation || `Тууганы ${i + 1}`}
          value={`${r.name} · ${r.phone}`}
          onPress={() => Linking.openURL(`tel:${r.phone.replace(/[^\d+]/g, '')}`)}
        />
      ))}
      {(!!p.address || !!p.birthDate) && (
        <Text style={styles.muted}>
          {[p.birthDate && `Туулган: ${p.birthDate}`, p.address && `Дареги: ${p.address}`].filter(Boolean).join(' · ')}
        </Text>
      )}
    </View>
  );
}

// Ижарага келген өтүнмөлөр: паспорт, телефон, GPS — админ гана көрөт
export default function AdminRentRequests() {
  const [list, setList] = useState<RentRequest[]>([]);
  const [filter, setFilter] = useState<RentStatus | 'all'>('new');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchRentRequests();
      setList(rows);
      fetchProfiles(rows.map((r) => r.userId ?? ''))
        .then(setProfiles)
        .catch(() => {});
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes('rental_requests') ? 'SQL иштетиле элек (007_rental_requests.sql).' : 'Жүктөлгөн жок: ' + msg);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const change = async (id: string, status: RentStatus) => {
    try {
      await setRentStatus(id, status);
      setList((l) => l.map((x) => (x.id === id ? { ...x, status } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ката кетти');
    }
  };

  const verify = async (id: string, v: boolean) => {
    try {
      await setVerified(id, v);
      setProfiles((m) => ({ ...m, [id]: { ...m[id], verified: v } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ката кетти');
    }
  };

  const shown = filter === 'all' ? list : list.filter((r) => r.status === filter);
  const count = (s: RentStatus) => list.filter((r) => r.status === s).length;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {FILTERS.map((f) => (
          <Chip key={f} label={f === 'all' ? `Баары (${list.length})` : `${STATUS[f].label} (${count(f)})`} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </ScrollView>

      {error && <Text style={{ color: colors.danger }}>{error}</Text>}
      {!loading && shown.length === 0 && <Text style={styles.empty}>Өтүнмө жок. Ылдый тартып жаңыртыңыз.</Text>}

      {shown.map((r) => (
        <Card key={r.id} style={{ gap: 8 }}>
          <View style={styles.head}>
            <Text style={styles.name}>{r.name}</Text>
            <View style={[styles.badge, { backgroundColor: STATUS[r.status].color }]}>
              <Text style={styles.badgeText}>{STATUS[r.status].label}</Text>
            </View>
          </View>
          <Text style={styles.muted}>{fmtDate(r.createdAt)}</Text>

          <Row icon="phone" label="Телефон" value={r.phone} onPress={() => Linking.openURL(`tel:${r.phone.replace(/[^\d+]/g, '')}`)} />
          <Row icon="card-account-details-outline" label="Паспорт" value={r.passport} />
          <Row icon="bicycle-electric" label="Велосипед" value={r.bikeName} />
          <Row icon="calendar-range" label="Мөөнөт" value={`${r.count} ${UNIT[r.period]}${r.total ? ` · ${formatPrice(r.total)}` : ''}`} />
          {!!r.startText && <Row icon="calendar-start" label="Башталышы" value={r.startText} />}
          {r.lat != null && r.lng != null ? (
            <Row
              icon="map-marker"
              label="GPS"
              value={`Картада көрүү${r.accuracy ? ` (±${Math.round(r.accuracy)} м)` : ''}`}
              onPress={() => Linking.openURL(mapLink(r.lat!, r.lng!))}
            />
          ) : (
            <Row icon="map-marker-off" label="GPS" value="Берилген жок" />
          )}

          {r.userId && profiles[r.userId] && <CustomerDocs p={profiles[r.userId]} onVerify={(v) => verify(r.userId!, v)} />}

          <View style={styles.actions}>
            {(['active', 'returned', 'rejected'] as RentStatus[])
              .filter((s) => s !== r.status)
              .map((s) => (
                <Pressable key={s} onPress={() => change(r.id, s)} style={[styles.action, { borderColor: STATUS[s].color }]}>
                  <Text style={{ color: STATUS[s].color, fontWeight: '700', fontSize: 13 }}>{STATUS[s].label}</Text>
                </Pressable>
              ))}
          </View>
        </Card>
      ))}

      <Text style={styles.muted}>
        Паспорт маалыматтары жашыруун: аларды админ гана көрөт, кардарлар бири-биринин өтүнмөсүн көрө алышпайт. Ижара бүткөндөн кийин керексиз өтүнмөлөрдү өчүрүп туруңуз.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontSize: 17, fontWeight: '800', color: colors.text, flex: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  rowLabel: { color: colors.muted, width: 84, fontSize: 13 },
  rowValue: { flex: 1, color: colors.text, fontWeight: '600', fontSize: 14 },
  docsBox: { gap: 10, backgroundColor: colors.bg, borderRadius: radius.md, padding: 10 },
  docs: { flexDirection: 'row', gap: 8 },
  doc: { flex: 1, gap: 4, alignItems: 'center' },
  docImg: { width: '100%', aspectRatio: 1, borderRadius: radius.sm, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  docLabel: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  verifyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  action: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 7 },
});
