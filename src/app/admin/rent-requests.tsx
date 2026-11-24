import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ComponentProps, useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { DocImage } from '../../components/account/DocImage';
import { Button, Card, Chip, Field } from '../../components/ui';
import { colors, radius } from '../../config/theme';
import type { RentPeriod } from '../../data/rentals';
import { formatPrice } from '../../lib/format';
import { docUrl, fetchProfiles, Profile, setVerified } from '../../lib/account';
import { Equipment, fetchEquipment } from '../../lib/contentApi';
import { daysLeft, fetchPayments, fmtDay, PAY_METHODS, PayMethod, recordPayment, RentPayment } from '../../lib/notifications';
import { setLocalPaidUntil } from '../../lib/rentRequests';
import { priceFor } from '../../data/rentals';
import { useContent } from '../../context/ContentContext';
import { ContractDetails, fetchRentRequests, mapLink, RentRequest, RentStatus, returnRent, setRentStatus, startRent } from '../../lib/rentRequests';
import { router } from 'expo-router';
import { balanceOf, fmtSom } from '../../lib/wallet';
import { RENT_MIN_DAYS } from '../../data/rentals';

const STATUS: Record<RentStatus, { label: string; color: string }> = {
  new: { label: 'Жаңы', color: '#2563EB' },
  active: { label: 'Ижарада', color: '#2E7D32' },
  returned: { label: 'Кайтарылды', color: '#64748B' },
  rejected: { label: 'Четке кагылды', color: '#DC2626' },
};
type Filter = RentStatus | 'all' | 'due';
const FILTERS: Filter[] = ['due', 'new', 'active', 'returned', 'rejected', 'all'];
// Бүгүн/эртең төлөй тургандар жана кечиккендер
const isDue = (r: RentRequest) => r.status === 'active' && !r.billing && (daysLeft(r.paidUntil) ?? -1) <= 1;
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

// Төлөм абалы: ✅ төлөнгөн / 🟡 эртең-бүгүн / 🔴 кечикти
export function PayBadge({ paidUntil }: { paidUntil?: string }) {
  const d = daysLeft(paidUntil);
  if (d === null) return <Text style={[styles.pay, { backgroundColor: '#F1F5F9', color: colors.muted }]}>Төлөм жок</Text>;
  if (d < 0) return <Text style={[styles.pay, { backgroundColor: '#FEE2E2', color: colors.danger }]}>🔴 {-d} күн кечикти</Text>;
  if (d <= 1) return <Text style={[styles.pay, { backgroundColor: '#FEF3C7', color: '#92400E' }]}>🟡 {d === 0 ? 'Бүгүн' : 'Эртең'} төлөйт</Text>;
  return <Text style={[styles.pay, { backgroundColor: '#DCFCE7', color: colors.success }]}>✅ {fmtDay(paidUntil)} чейин</Text>;
}

const METHOD_LABEL = Object.fromEntries(PAY_METHODS.map((m) => [m.id, m.label])) as Record<PayMethod, string>;

// Төлөм кабыл алуу жана төлөмдөр тарыхы
function Payments({ r, unitPrice, onPaid }: { r: RentRequest; unitPrice?: number; onPaid: (until: string) => void }) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<RentPayment[] | null>(null);
  const [units, setUnits] = useState('1');
  const [amount, setAmount] = useState(unitPrice ? String(unitPrice) : '');
  const [method, setMethod] = useState<PayMethod>('cash');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadHistory = () =>
    fetchPayments(r.id)
      .then(setHistory)
      .catch(() => setHistory([]));

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const u = Math.max(1, Number(units) || 1);
      const until = await recordPayment(r.id, Number(amount.replace(/\D/g, '')) || 0, u, method, { period: r.period, paidUntil: r.paidUntil });
      await setLocalPaidUntil(r.id, until);
      onPaid(until);
      setOpen(false);
      loadHistory();
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setErr(m.includes('record_rent_payment') ? 'SQL иштетиле элек (010_notifications.sql).' : m);
    }
    setBusy(false);
  };

  return (
    <View style={styles.payBox}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <PayBadge paidUntil={r.paidUntil} />
        <Pressable onPress={() => (history ? setHistory(null) : loadHistory())} hitSlop={6}>
          <Text style={styles.link}>{history ? 'Тарыхты жашыруу' : 'Төлөмдөр тарыхы'}</Text>
        </Pressable>
      </View>
      {history && history.length === 0 && <Text style={styles.muted}>Азырынча төлөм жок</Text>}
      {history?.map((p) => (
        <Text key={p.id} style={styles.muted}>
          {fmtDay(p.createdAt)} · {formatPrice(p.amount)} · {METHOD_LABEL[p.method] ?? p.method} → {fmtDay(p.paidUntil)} чейин
        </Text>
      ))}
      {open ? (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field label={`Канча ${UNIT[r.period]}`} value={units} onChangeText={(v) => {
                setUnits(v);
                if (unitPrice) setAmount(String(unitPrice * Math.max(1, Number(v) || 1)));
              }} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1.4 }}>
              <Field label="Сумма, сом" value={amount} onChangeText={setAmount} keyboardType="number-pad" />
            </View>
          </View>
          <Text style={styles.rowLabel}>Кайда төлөдү</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {PAY_METHODS.map((m) => (
              <Chip key={m.id} label={m.label} active={method === m.id} onPress={() => setMethod(m.id)} />
            ))}
          </View>
          {err && <Text style={{ color: colors.danger }}>{err}</Text>}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Жокко чыгаруу" variant="outline" style={{ flex: 1 }} onPress={() => setOpen(false)} />
            <Button title="Сактоо" icon="cash-check" style={{ flex: 1 }} disabled={busy} onPress={save} />
          </View>
        </View>
      ) : (
        <Button title="Төлөм кабыл алуу" icon="cash-plus" onPress={() => setOpen(true)} />
      )}
    </View>
  );
}

// Велосипедди берүү: келишимдин маалыматы (кагаз келишимдегидей)
const KIT = ['Батарея', 'Заряддагыч', 'Багажник', 'Кулпу', 'Шлем'];
function StartForm({ r, defaults, onDone, onCancel }: { r: RentRequest; defaults: Partial<ContractDetails>; onDone: () => void; onCancel: () => void }) {
  const [bikeNo, setBikeNo] = useState(defaults.bikeNo ?? '');
  const [jorgoNo, setJorgoNo] = useState(defaults.jorgoNo ?? '');
  const [batteryNo, setBatteryNo] = useState(defaults.batteryNo ?? '');
  const [bikeValue, setBikeValue] = useState(defaults.bikeValue ? String(defaults.bikeValue) : '');
  const [deposit, setDeposit] = useState(defaults.deposit ? String(defaults.deposit) : '');
  const [collateral, setCollateral] = useState('');
  const [kit, setKit] = useState<string[]>(['Батарея', 'Заряддагыч', 'Багажник']);
  const [defects, setDefects] = useState<'none' | 'scratches'>('none');
  const [handoverNote, setHandoverNote] = useState('');
  const [handoverOk, setHandoverOk] = useState(true);
  const [staff, setStaff] = useState(defaults.staff ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const num = (v: string) => (v.replace(/\D/g, '') ? parseInt(v.replace(/\D/g, ''), 10) : undefined);
  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await startRent(r.id, { bikeNo: bikeNo.trim(), jorgoNo: jorgoNo.trim(), batteryNo: batteryNo.trim(), bikeValue: num(bikeValue), deposit: num(deposit), collateral: collateral.trim(), kit, defects, handoverNote: handoverNote.trim(), handoverOk, staff: staff.trim() });
      onDone();
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setErr(m.includes('admin_rent_start') ? 'SQL иштетиле элек (028).' : m);
    }
    setBusy(false);
  };
  return (
    <View style={styles.payBox}>
      <Text style={{ fontWeight: '900', color: colors.text, fontSize: 15 }}>🚲 Велосипедди берүү — келишим</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Field label="Велосипеддин номери" value={bikeNo} onChangeText={setBikeNo} placeholder="0476" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Жорго №" value={jorgoNo} onChangeText={setJorgoNo} placeholder="4" />
        </View>
      </View>
      <Field label="Батарея (номери)" value={batteryNo} onChangeText={setBatteryNo} placeholder="13/70" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Field label="Велосипеддин баасы, сом" value={bikeValue} onChangeText={setBikeValue} keyboardType="number-pad" placeholder="10000" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Депозит, сом" value={deposit} onChangeText={setDeposit} keyboardType="number-pad" placeholder="3000" />
        </View>
      </View>
      <Field label="Залог (эмне калтырды)" value={collateral} onChangeText={setCollateral} placeholder="Мисалы: айдоочулук күбөлүк" />
      <Text style={styles.rowLabel}>Комплектация</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {KIT.map((k) => (
          <Chip key={k} label={k} active={kit.includes(k)} onPress={() => setKit((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]))} />
        ))}
      </View>
      <Text style={{ fontWeight: '900', color: colors.text, marginTop: 6 }}>📋 Кабыл алуу-өткөрүп берүү акты</Text>
      <Text style={styles.rowLabel}>Берилгенде кемчилиги</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Chip label="Кемчилиги жок" active={defects === 'none'} onPress={() => setDefects('none')} />
        <Chip label="Чийилген (царапины)" active={defects === 'scratches'} onPress={() => setDefects('scratches')} />
      </View>
      <Field label="Сүрөттөп жазуу (керек болсо)" value={handoverNote} onChangeText={setHandoverNote} placeholder="Мисалы: сол жагы чийилген" />
      <View style={styles.verifyRow}>
        <MaterialCommunityIcons name="check-decagram" size={18} color={colors.primary} />
        <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>Тормоз, дөңгөлөк, передача — иштейт</Text>
        <Switch value={handoverOk} onValueChange={setHandoverOk} trackColor={{ true: colors.primary, false: colors.border }} />
      </View>
      <Field label="Ким берди (Выдал)" value={staff} onChangeText={setStaff} placeholder="Атыңыз" />
      {err && <Text style={{ color: colors.danger }}>{err}</Text>}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="Жокко чыгаруу" variant="outline" style={{ flex: 1 }} onPress={onCancel} />
        <Button title="Берүү жана баштоо" icon="bicycle-electric" style={{ flex: 1 }} disabled={busy} onPress={save} />
      </View>
    </View>
  );
}

// Велосипед кайтарылды: абалы жана зыян (электроника 50%, механика 100%, жоголгон 100%, батарея акысыз)
function ReturnForm({ r, onDone, onCancel }: { r: RentRequest; onDone: () => void; onCancel: () => void }) {
  const [el, setEl] = useState('');
  const [mech, setMech] = useState('');
  const [lost, setLost] = useState('');
  const [battery, setBattery] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const n = (v: string) => Math.max(0, parseInt(v.replace(/\D/g, ''), 10) || 0);
  // Келишимдеги прайс (4.1): басса механика суммасына жана эскертүүгө кошулат
  const PRICE: [string, number][] = [
    ['Прокол', 300],
    ['Восьмерка (дөңгөлөк ийилген)', 1500],
    ['Переключатель сынган', 600],
    ['Отургуч (седло) айрылган', 1000],
    ['Кулпу / фара жоголду', 1000],
  ];
  const addPrice = (name: string, sum: number) => {
    setMech(String(n(mech) + sum));
    setNote((x) => (x ? `${x}, ${name}` : name));
  };
  const restDays = r.billing ? Math.max(0, RENT_MIN_DAYS - (r.chargedDays ?? 0)) : 0;
  const rest = restDays * (r.dailyPrice ?? 0);
  const dmg = Math.round(n(el) * 0.5) + n(mech) + n(lost);
  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await returnRent(r.id, { electronics: n(el), mechanics: n(mech), lost: n(lost), battery, note: note.trim() });
      onDone();
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setErr(m.includes('admin_rent_return') ? 'SQL иштетиле элек (027).' : m);
    }
    setBusy(false);
  };
  return (
    <View style={styles.payBox}>
      <Text style={{ fontWeight: '900', color: colors.text, fontSize: 15 }}>🔧 Кандай абалда алып келди?</Text>
      <Field label="Электроника бузулду — баасы (кардар 50% төлөйт)" value={el} onChangeText={setEl} keyboardType="number-pad" placeholder="0" />
      <Text style={styles.rowLabel}>Прайс (басса кошулат):</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {PRICE.map(([name, sum]) => (
          <Chip key={name} label={`${name} · ${sum}`} active={false} onPress={() => addPrice(name, sum)} />
        ))}
      </View>
      <Field label="Механика бузулду — баасы (кардар толук төлөйт)" value={mech} onChangeText={setMech} keyboardType="number-pad" placeholder="0" />
      <Field label={`Жоголду — баасы (толук)${r.bikeValue ? ` · велосипед ${fmtSom(r.bikeValue)}` : ''}`} value={lost} onChangeText={setLost} keyboardType="number-pad" placeholder="0" />
      <View style={styles.verifyRow}>
        <MaterialCommunityIcons name="battery-sync" size={18} color={colors.primary} />
        <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>Батарея алмаштырылды (акысыз)</Text>
        <Switch value={battery} onValueChange={setBattery} trackColor={{ true: colors.primary, false: colors.border }} />
      </View>
      <Field label="Эскертүү" value={note} onChangeText={setNote} placeholder="Мисалы: арткы тормоз сынган" />
      <View style={{ gap: 2, backgroundColor: colors.bg, borderRadius: radius.md, padding: 10 }}>
        {rest > 0 && <Text style={{ color: colors.text }}>Минимум {RENT_MIN_DAYS} күн: дагы {restDays} күн × {fmtSom(r.dailyPrice ?? 0)} = <Text style={{ fontWeight: '800' }}>{fmtSom(rest)}</Text></Text>}
        {dmg > 0 && <Text style={{ color: colors.text }}>Зыян: <Text style={{ fontWeight: '800' }}>{fmtSom(dmg)}</Text></Text>}
        <Text style={{ color: colors.danger, fontWeight: '800' }}>Балансынан алынат: {fmtSom(rest + dmg)}</Text>
        {!!r.deposit && <Text style={{ color: colors.muted, fontSize: 12 }}>Депозит {fmtSom(r.deposit)} — колго берилген. Велосипед бузулбаса кайтарылат; зыян болсо ошондон кармаса болот (4.3).</Text>}
      </View>
      {err && <Text style={{ color: colors.danger }}>{err}</Text>}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="Жокко чыгаруу" variant="outline" style={{ flex: 1 }} onPress={onCancel} />
        <Button title="Кабыл алдым" icon="check" style={{ flex: 1 }} disabled={busy} onPress={save} />
      </View>
    </View>
  );
}

// Ижарага келген өтүнмөлөр: паспорт, телефон, GPS — админ гана көрөт
export default function AdminRentRequests() {
  const [list, setList] = useState<RentRequest[]>([]);
  const [filter, setFilter] = useState<Filter>('new');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [equipment, setEquipment] = useState<Record<string, Equipment>>({});
  const { rentals } = useContent();
  const [returning, setReturning] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [balances, setBalances] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchRentRequests();
      setList(rows);
      fetchProfiles(rows.map((r) => r.userId ?? ''))
        .then(setProfiles)
        .catch(() => {});
      fetchEquipment()
        .then(setEquipment)
        .catch(() => {});
      [...new Set(rows.filter((r) => r.billing && r.userId && r.status !== 'returned').map((r) => r.userId!))].forEach((u) =>
        balanceOf(u)
          .then((b) => setBalances((m) => ({ ...m, [u]: b })))
          .catch(() => {}),
      );
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

  const shown = filter === 'all' ? list : filter === 'due' ? list.filter(isDue) : list.filter((r) => r.status === filter);
  const count = (s: RentStatus) => list.filter((r) => r.status === s).length;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {FILTERS.map((f) => (
          <Chip key={f} label={f === 'all' ? `Баары (${list.length})` : f === 'due' ? `⚠️ Төлөм күнү / кечиккен (${list.filter(isDue).length})` : `${STATUS[f].label} (${count(f)})`} active={filter === f} onPress={() => setFilter(f)} />
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
          {r.billing ? (
            <>
              <Row icon="cash-clock" label="Тариф" value={`күнүнө ${formatPrice(r.dailyPrice ?? 0)} · минимум ${RENT_MIN_DAYS} күн`} />
              {!!r.startedAt && <Row icon="calendar-start" label="Башталды" value={`${fmtDate(r.startedAt)} · ${r.chargedDays ?? 0} күн алынды`} />}
              {r.userId && balances[r.userId] !== undefined && (
                <Row icon="wallet" label="Балансы" value={`${fmtSom(balances[r.userId])}${balances[r.userId] <= (r.dailyPrice ?? 0) ? '  ⚠️ аз калды' : ''}`} />
              )}
              {r.status === 'returned' && (
                <Text style={styles.muted}>
                  ✅ Кайтарылды{r.returnedAt ? ` ${fmtDate(r.returnedAt)}` : ''} · {r.chargedDays} күн
                  {r.damageCharged ? ` · зыян ${fmtSom(r.damageCharged)}` : ''}
                  {r.batterySwapped ? ' · батарея алмаштырылды' : ''}
                  {r.returnNote ? ` · ${r.returnNote}` : ''}
                </Text>
              )}
            </>
          ) : (
            <Row icon="calendar-range" label="Мөөнөт" value={`${r.count} ${UNIT[r.period]}${r.total ? ` · ${formatPrice(r.total)}` : ''}`} />
          )}
          {!!equipment[r.bikeId]?.gpsNo && <Row icon="crosshairs-gps" label="GPS номери" value={equipment[r.bikeId].gpsNo} />}
          {!!equipment[r.bikeId]?.battery1No && <Row icon="battery-50" label="Батарея 1" value={equipment[r.bikeId].battery1No} />}
          {!!equipment[r.bikeId]?.battery2No && <Row icon="battery-50" label="Батарея 2" value={equipment[r.bikeId].battery2No} />}
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

          {!r.billing && (r.status === 'active' || r.status === 'new') && (
            <Payments
              r={r}
              unitPrice={(() => {
                const b = rentals.find((x) => x.id === r.bikeId);
                return b ? priceFor(b, r.period) : undefined;
              })()}
              onPaid={(until) => setList((l) => l.map((x) => (x.id === r.id ? { ...x, paidUntil: until, status: x.status === 'new' ? 'active' : x.status } : x)))}
            />
          )}

          {r.billing && returning === r.id && (
            <ReturnForm
              r={r}
              onCancel={() => setReturning(null)}
              onDone={() => {
                setReturning(null);
                load();
              }}
            />
          )}
          {r.billing && starting === r.id && (
            <StartForm
              r={r}
              defaults={{
                batteryNo: [equipment[r.bikeId]?.battery1No, equipment[r.bikeId]?.battery2No].filter(Boolean).join(' / '),
                deposit: rentals.find((b) => b.id === r.bikeId)?.deposit,
              }}
              onCancel={() => setStarting(null)}
              onDone={() => {
                setStarting(null);
                setFilter('active');
                load();
              }}
            />
          )}
          {!!r.contractNo && (
            <Pressable onPress={() => router.push({ pathname: '/admin/contract/[id]', params: { id: r.id } })}>
              <Text style={{ color: '#2563EB', fontWeight: '800' }}>📄 Келишим №{r.contractNo} — ачуу / басып чыгаруу</Text>
            </Pressable>
          )}
          {r.billing && returning !== r.id && starting !== r.id && r.status !== 'returned' && r.status !== 'rejected' && (
            <View style={styles.actions}>
              {r.status === 'new' && (
                <Pressable onPress={() => setStarting(r.id)} style={[styles.action, { backgroundColor: colors.success, borderColor: colors.success }]}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>🚲 Велосипедди берди — ижараны баштоо</Text>
                </Pressable>
              )}
              {r.status === 'active' && (
                <Pressable onPress={() => setReturning(r.id)} style={[styles.action, { borderColor: '#64748B' }]}>
                  <Text style={{ color: '#64748B', fontWeight: '800', fontSize: 13 }}>↩️ Кайтарылды (абалын жазуу)</Text>
                </Pressable>
              )}
              {r.status === 'new' && (
                <Pressable onPress={() => change(r.id, 'rejected')} style={[styles.action, { borderColor: STATUS.rejected.color }]}>
                  <Text style={{ color: STATUS.rejected.color, fontWeight: '700', fontSize: 13 }}>{STATUS.rejected.label}</Text>
                </Pressable>
              )}
            </View>
          )}
          {!r.billing && <View style={styles.actions}>
            {(['active', 'returned', 'rejected'] as RentStatus[])
              .filter((s) => s !== r.status)
              .map((s) => (
                <Pressable key={s} onPress={() => change(r.id, s)} style={[styles.action, { borderColor: STATUS[s].color }]}>
                  <Text style={{ color: STATUS[s].color, fontWeight: '700', fontSize: 13 }}>{STATUS[s].label}</Text>
                </Pressable>
              ))}
          </View>}
        </Card>
      ))}

      <Text style={styles.muted}>
        Паспорт маалыматтары жашыруун: аларды админ гана көрөт, кардарлар бири-биринин өтүнмөсүн көрө алышпайт. Ижара бүткөндөн кийин керексиз өтүнмөлөрдү өчүрүп туруңуз.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pay: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, fontWeight: '800', fontSize: 13, overflow: 'hidden' },
  payBox: { gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  link: { color: colors.primary, fontWeight: '700', fontSize: 13 },
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
