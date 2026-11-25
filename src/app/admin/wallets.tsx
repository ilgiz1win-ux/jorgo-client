import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Field } from '../../components/ui';
import { colors, radius } from '../../config/theme';
import { docUrl } from '../../lib/account';
import { adjustWallet, decideTopup, DEFAULT_WALLET, fetchTopups, fetchTx, fetchWallets, fmtSom, getWalletSettings, PAGE, saveWalletSettings, Topup, TX_LABEL, WalletRow, WalletSettings, WalletTx } from '../../lib/wallet';

const ST: Record<Topup['status'], { label: string; color: string }> = {
  new: { label: 'Жаңы', color: '#D97706' },
  approved: { label: 'Ырасталды', color: colors.success },
  rejected: { label: 'Четке кагылды', color: colors.danger },
};
const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Админ: кардарлардын балансы, толуктоо өтүнмөлөрү, выезддин баасы
export default function AdminWallets() {
  const [tops, setTops] = useState<Topup[]>([]);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [cfg, setCfg] = useState<WalletSettings>(DEFAULT_WALLET);
  const [feeText, setFeeText] = useState(String(DEFAULT_WALLET.outcallFee));
  const [tab, setTab] = useState<'new' | 'all' | 'balances' | 'settings'>('new');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [hist, setHist] = useState<WalletTx[]>([]);
  const [adjAmount, setAdjAmount] = useState('');
  const [adjNote, setAdjNote] = useState('');
  const [search, setSearch] = useState('');
  const [shots, setShots] = useState<Record<string, string>>({});
  // «Бардык толуктоолор»: мезгил сүзгүчү, жалпы сумма жана «Дагы көрсөтүү»
  const [period, setPeriod] = useState<'today' | '7' | '30' | 'all'>('30');
  const [allTops, setAllTops] = useState<Topup[]>([]);
  const [allMore, setAllMore] = useState(false);
  const [histMore, setHistMore] = useState(false);
  const sinceOf = (p: typeof period) => {
    if (p === 'all') return undefined;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (p !== 'today') d.setDate(d.getDate() - (Number(p) - 1));
    return d.toISOString();
  };
  const loadAll = useCallback(async (p: typeof period) => {
    const l = await fetchTopups({ since: sinceOf(p), limit: 100 }).catch(() => [] as Topup[]);
    setAllTops(l);
    setAllMore(l.length >= 100);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (tab === 'all') loadAll(period);
  }, [tab, period, loadAll]);
  // Скриншоттор жабык бакетте — убактылуу шилтеме алабыз
  useEffect(() => {
    [...tops, ...allTops]
      .filter((t) => t.receipt && !shots[t.id])
      .slice(0, 30)
      .forEach((t) => {
        if (t.receipt!.startsWith('data:')) return setShots((m) => ({ ...m, [t.id]: t.receipt! }));
        docUrl(t.receipt).then((u) => u && setShots((m) => ({ ...m, [t.id]: u })));
      });
  }, [tops, allTops]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, w, c] = await Promise.all([fetchTopups(), fetchWallets(), getWalletSettings()]);
      setTops(t);
      setWallets(w);
      setCfg(c);
      setFeeText(String(c.outcallFee));
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setError(m.includes('topup') || m.includes('wallet') ? 'SQL иштетиле элек (021).' : m);
    }
    setLoading(false);
  }, []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const decide = async (id: string, ok: boolean) => {
    try {
      await decideTopup(id, ok);
      load();
      if (tab === 'all') loadAll(period);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ката кетти');
    }
  };
  const showReceipt = async (path?: string) => {
    const u = await docUrl(path);
    if (u) Linking.openURL(u);
  };
  const openUser = async (userId: string) => {
    if (open === userId) return setOpen(null);
    setOpen(userId);
    setAdjAmount('');
    setAdjNote('');
    const h = await fetchTx(userId).catch(() => [] as WalletTx[]);
    setHist(h);
    setHistMore(h.length >= PAGE);
  };
  const adjust = async (userId: string) => {
    const n = parseInt(adjAmount.replace(/[^\d-]/g, ''), 10);
    if (!n) return;
    try {
      await adjustWallet(userId, n, adjNote.trim());
      setHist(await fetchTx(userId));
      setAdjAmount('');
      setAdjNote('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ката кетти');
    }
  };
  const saveCfg = async () => {
    setOkMsg(null);
    try {
      const c = { outcallFee: Math.max(0, parseInt(feeText.replace(/\D/g, ''), 10) || 0), topupInfo: cfg.topupInfo.trim() };
      await saveWalletSettings(c);
      setCfg(c);
      setOkMsg('Сакталды ✅');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ката кетти');
    }
  };

  const pending = tops.filter((t) => t.status === 'new');
  const qq = search.trim().toLowerCase().replace(/\s/g, '');
  const shownTops = (tab === 'new' ? pending : allTops).filter(
    (t) => !qq || [t.code, String(t.amount), t.name, t.phone, t.senderName, t.senderAccount].some((v) => (v ?? '').toLowerCase().replace(/\s/g, '').includes(qq)),
  );
  const total = wallets.reduce((s, w) => s + w.balance, 0);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label={`Жаңы толуктоолор (${pending.length})`} active={tab === 'new'} onPress={() => setTab('new')} />
          <Chip label="Бардык толуктоолор" active={tab === 'all'} onPress={() => setTab('all')} />
          <Chip label={`Баланстар (${wallets.length})`} active={tab === 'balances'} onPress={() => setTab('balances')} />
          <Chip label="⚙️ Выезд баасы, реквизит" active={tab === 'settings'} onPress={() => setTab('settings')} />
        </ScrollView>
        {error && <Text style={{ color: colors.danger }}>{error}</Text>}

        {(tab === 'new' || tab === 'all') && (
          <>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
              Кардардын скриншотундагы сумманы, убакытты жана атын банк колдонмосунан түшкөн акча менен салыштырыңыз. Акча чындап түшкөндө гана ырастаңыз.
            </Text>
            <Field label="Издөө: код, сумма, аты же номери" value={search} onChangeText={setSearch} placeholder="J1027" autoCapitalize="characters" />
            {tab === 'all' && (
              <>
                <View style={[styles.row, { gap: 6 }]}>
                  {(
                    [
                      ['today', 'Бүгүн'],
                      ['7', '7 күн'],
                      ['30', '30 күн'],
                      ['all', 'Баары'],
                    ] as const
                  ).map(([k, l]) => (
                    <Chip key={k} label={l} active={period === k} onPress={() => setPeriod(k)} />
                  ))}
                </View>
                <View style={styles.sumBox}>
                  <Text style={styles.sumBig}>{fmtSom(shownTops.filter((t) => t.status === 'approved').reduce((s, t) => s + t.amount, 0))}</Text>
                  <Text style={styles.label}>
                    Ырасталды: {shownTops.filter((t) => t.status === 'approved').length} · Каралууда: {shownTops.filter((t) => t.status === 'new').length} (
                    {fmtSom(shownTops.filter((t) => t.status === 'new').reduce((s, t) => s + t.amount, 0))}) · Четке кагылды: {shownTops.filter((t) => t.status === 'rejected').length}
                  </Text>
                </View>
              </>
            )}
            {!loading && shownTops.length === 0 && <Text style={styles.empty}>Толуктоо өтүнмөсү жок</Text>}
            {shownTops.map((t) => (
              <Card key={t.id} style={{ gap: 6, borderLeftWidth: 5, borderLeftColor: ST[t.status].color }}>
                <View style={styles.row}>
                  {!!t.code && <Text style={styles.code}>{t.code}</Text>}
                  <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text }}>{fmtSom(t.amount)}</Text>
                  <Text style={[styles.badge, { backgroundColor: ST[t.status].color }]}>{ST[t.status].label}</Text>
                  <Text style={{ marginLeft: 'auto', color: colors.muted, fontSize: 12 }}>{fmt(t.createdAt)}</Text>
                </View>
                <Pressable onPress={() => router.push({ pathname: '/admin/customer/[id]', params: { id: t.userId } })}>
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>
                    👤 {t.name || '—'} · {t.phone || ''}
                  </Text>
                </Pressable>
                <Text style={styles.text}>💳 {t.method || '—'}</Text>
                {(!!t.senderName || !!t.senderAccount) && (
                  <Text style={styles.text}>
                    🏦 Которгон: <Text style={{ fontWeight: '800' }}>{[t.senderName, t.senderAccount].filter(Boolean).join(' · ')}</Text>
                  </Text>
                )}
                {!!t.comment && <Text style={styles.text}>💬 {t.comment}</Text>}
                {!!t.receipt &&
                  (shots[t.id] ? (
                    <Pressable onPress={() => (shots[t.id].startsWith('data:') ? null : Linking.openURL(shots[t.id]))}>
                      <Image source={{ uri: shots[t.id] }} style={styles.shot} resizeMode="contain" />
                      <Text style={{ color: '#2563EB', fontWeight: '700', marginTop: 4 }}>🧾 Скриншотту чоң ачуу</Text>
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => showReceipt(t.receipt)}>
                      <Text style={{ color: '#2563EB', fontWeight: '700' }}>🧾 Скриншотту көрүү</Text>
                    </Pressable>
                  ))}
                {t.status === 'new' && (
                  <>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>Банктан акча түшкөнүн текшерип, анан ырастаңыз.</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable onPress={() => decide(t.id, true)} style={[styles.action, { backgroundColor: colors.success, borderColor: colors.success, flex: 1 }]}>
                        <Text style={{ color: '#fff', fontWeight: '800' }}>✅ Акча түштү — ырастоо</Text>
                      </Pressable>
                      <Pressable onPress={() => decide(t.id, false)} style={[styles.action, { borderColor: colors.danger }]}>
                        <Text style={{ color: colors.danger, fontWeight: '800' }}>Четке кагуу</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </Card>
            ))}
            {tab === 'all' && allMore && (
              <Button
                title="Дагы көрсөтүү"
                variant="outline"
                onPress={async () => {
                  const more = await fetchTopups({ since: sinceOf(period), before: allTops[allTops.length - 1]?.createdAt, limit: 100 }).catch(() => [] as Topup[]);
                  setAllTops((l) => [...l, ...more]);
                  setAllMore(more.length >= 100);
                }}
              />
            )}
          </>
        )}

        {tab === 'balances' && (
          <>
            <Text style={{ color: colors.muted }}>Бардык кардарлардын балансы: <Text style={{ fontWeight: '900', color: colors.text }}>{fmtSom(total)}</Text></Text>
            {!loading && wallets.length === 0 && <Text style={styles.empty}>Азырынча баланс жок</Text>}
            {wallets.map((w) => (
              <Card key={w.userId} style={{ gap: 8 }}>
                <Pressable style={styles.row} onPress={() => openUser(w.userId)}>
                  <MaterialCommunityIcons name="account-circle" size={30} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '800', color: colors.text }}>{w.name}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{w.phone}</Text>
                  </View>
                  <Text style={{ fontWeight: '900', fontSize: 16, color: w.balance > 0 ? colors.success : colors.text }}>{fmtSom(w.balance)}</Text>
                  <MaterialCommunityIcons name={open === w.userId ? 'chevron-up' : 'chevron-down'} size={22} color={colors.muted} />
                </Pressable>
                {open === w.userId && (
                  <View style={{ gap: 8 }}>
                    {hist.map((x) => (
                      <View key={x.id} style={styles.row}>
                        <Text style={{ flex: 1, color: colors.text, fontSize: 13 }}>
                          {TX_LABEL[x.kind]} · {fmt(x.createdAt)}
                          {x.note ? ` · ${x.note}` : ''}
                        </Text>
                        <Text style={{ fontWeight: '800', color: x.amount > 0 ? colors.success : colors.danger }}>
                          {x.amount > 0 ? '+' : ''}
                          {x.amount}
                        </Text>
                      </View>
                    ))}
                    {histMore && (
                      <Pressable
                        onPress={async () => {
                          const more = await fetchTx(w.userId, hist[hist.length - 1]?.createdAt).catch(() => [] as WalletTx[]);
                          setHist((l) => [...l, ...more]);
                          setHistMore(more.length >= PAGE);
                        }}
                      >
                        <Text style={{ color: colors.primary, fontWeight: '800' }}>Дагы көрсөтүү ↓</Text>
                      </Pressable>
                    )}
                    <Pressable onPress={() => router.push({ pathname: '/admin/customer/[id]', params: { id: w.userId } })}>
                      <Text style={{ color: colors.primary, fontWeight: '800' }}>Кардардын толук барагы →</Text>
                    </Pressable>
                    <Text style={styles.label}>Балансты кол менен өзгөртүү (мисалы: 500 же -500)</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Field label="Сумма" value={adjAmount} onChangeText={setAdjAmount} keyboardType="numbers-and-punctuation" placeholder="500" />
                      </View>
                      <View style={{ flex: 2 }}>
                        <Field label="Себеби" value={adjNote} onChangeText={setAdjNote} placeholder="Накталай берди" />
                      </View>
                    </View>
                    <Button title="Сактоо" icon="content-save" disabled={!parseInt(adjAmount.replace(/[^\d-]/g, ''), 10)} onPress={() => adjust(w.userId)} />
                  </View>
                )}
              </Card>
            ))}
          </>
        )}

        {tab === 'settings' && (
          <Card style={{ gap: 12 }}>
            <Field label="Выезддин баасы (сом)" value={feeText} onChangeText={setFeeText} keyboardType="number-pad" />
            <Field
              label="Толуктоо үчүн реквизиттер (кардарга көрүнөт)"
              value={cfg.topupInfo}
              onChangeText={(v) => setCfg({ ...cfg, topupInfo: v })}
              multiline
              placeholder="MBank: 0700 123 456 (Ильгиз М.)"
            />
            {okMsg && <Text style={{ color: colors.success, fontWeight: '700' }}>{okMsg}</Text>}
            <Button title="Сактоо" icon="content-save" onPress={saveCfg} />
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  shot: { width: 220, height: 320, borderRadius: 10, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  code: { fontSize: 18, fontWeight: '900', color: '#fff', backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden', letterSpacing: 1 },
  badge: { color: '#fff', fontWeight: '800', fontSize: 12, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  text: { color: colors.text, fontSize: 14 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 24 },
  sumBox: { backgroundColor: '#F0FDF4', borderRadius: radius.md, padding: 12, gap: 4, borderWidth: 1, borderColor: '#BBF7D0' },
  sumBig: { fontSize: 22, fontWeight: '900', color: colors.success },
  action: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
});
