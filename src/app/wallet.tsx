import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RequireAccount } from '../components/account/RequireAccount';
import { ChatButton } from '../components/chat/ChatButton';
import { Button, Card, Chip, Field, SectionTitle } from '../components/ui';
import { colors, radius } from '../config/theme';
import { useAccount } from '../context/AccountContext';
import { TKey, useT } from '../i18n';
import { fetchTopups, fetchTx, fmtSom, getWalletSettings, myBalance, PAGE, pickReceipt, Receipt, sendTopup, Topup, WalletSettings, WalletTx, DEFAULT_WALLET } from '../lib/wallet';

const AMOUNTS = [500, 1000, 2000, 5000];
const METHODS = ['MBank', 'O!Деньги', 'Бакай', 'Элсом', 'Накталай'];
const ST_COLOR = { new: '#D97706', approved: colors.success, rejected: colors.danger };
const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Кардардын балансы: канча бар, кантип толуктайт, тарых
function Wallet() {
  const { t } = useT();
  const { profile } = useAccount();
  const [balance, setBalance] = useState<number | null>(null);
  const [cfg, setCfg] = useState<WalletSettings>(DEFAULT_WALLET);
  const [tx, setTx] = useState<WalletTx[]>([]);
  const [tops, setTops] = useState<Topup[]>([]);
  // «Дагы көрсөтүү»: тарыхтын баары барак-барак жүктөлөт
  const [txMore, setTxMore] = useState(false);
  const [topMore, setTopMore] = useState(false);
  const [moreBusy, setMoreBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('1000');
  const [method, setMethod] = useState(METHODS[0]);
  const [comment, setComment] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  // Акыркы түзүлгөн толуктоо (коду менен)
  const [made, setMade] = useState<{ id: string; code: string; amount: number } | null>(null);
  const [shot, setShot] = useState<Receipt | null>(null);
  const [shotBusy, setShotBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, c, x, tp] = await Promise.all([myBalance(), getWalletSettings(), fetchTx(), fetchTopups({ userId: profile?.id, limit: 10 })]);
      setBalance(b);
      setCfg(c);
      setTx(x);
      setTxMore(x.length >= PAGE);
      setTops(tp);
      setTopMore(tp.length >= 10);
    } catch (e) {
      const m = e instanceof Error ? e.message : '';
      setMsg({ ok: false, text: m.includes('wallet') || m.includes('topup') ? t('w.notReady') : t('chat.error') });
    }
    setLoading(false);
  }, [profile, t]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const num = parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const submit = async () => {
    if (!shot) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await sendTopup({ amount: num, method, senderName, senderAccount, comment, receipt: shot });
      setMade({ ...r, amount: num });
      setComment('');
      setShot(null);
      load();
    } catch (e) {
      const m = e instanceof Error ? e.message : '';
      setMsg({ ok: false, text: m === 'duplicate' ? t('w.dupShot') : t('chat.error') });
    }
    setBusy(false);
  };
  const addShot = async () => {
    if (!profile) return;
    setMsg(null);
    setShotBusy(true);
    try {
      const r = await pickReceipt(profile.id);
      if (r) setShot(r);
    } catch {
      setMsg({ ok: false, text: t('repair.photoErr') });
    }
    setShotBusy(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        <View style={styles.hero}>
          <MaterialCommunityIcons name="wallet" size={34} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.primarySoft, fontWeight: '600' }}>{t('w.balance')}</Text>
            {balance === null ? <ActivityIndicator color="#fff" /> : <Text style={styles.balance}>{fmtSom(balance)}</Text>}
          </View>
        </View>
        <View style={styles.note}>
          <MaterialCommunityIcons name="car-side" size={20} color="#92400E" />
          <Text style={{ flex: 1, color: '#78350F', lineHeight: 20 }}>{t('w.outcallInfo', { v: String(cfg.outcallFee) })}</Text>
        </View>

        <SectionTitle>{t('w.topup')}</SectionTitle>
        {made ? (
          <Card style={{ gap: 12, borderColor: colors.success, borderWidth: 2, alignItems: 'center' }}>
            <MaterialCommunityIcons name="check-circle" size={52} color={colors.success} />
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16, textAlign: 'center' }}>{t('w.sentTitle', { v: fmtSom(made.amount) })}</Text>
            <Text style={{ color: colors.muted, textAlign: 'center', lineHeight: 20 }}>{t('w.sent')}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{t('w.ref', { v: made.code })}</Text>
            <Button title={t('w.another')} variant="outline" onPress={() => setMade(null)} />
          </Card>
        ) : (
          <Card style={{ gap: 12 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>1. {t('w.step1')}</Text>
            <Text selectable style={styles.info}>{cfg.topupInfo}</Text>
            <Text style={{ color: colors.text, fontWeight: '700' }}>2. {t('w.stepAmount')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {AMOUNTS.map((a) => (
                <Chip key={a} label={`${a} сом`} active={num === a} onPress={() => setAmount(String(a))} />
              ))}
            </View>
            <Field label={t('w.amount')} value={amount} onChangeText={setAmount} keyboardType="number-pad" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {METHODS.map((m) => (
                <Chip key={m} label={m} active={method === m} onPress={() => setMethod(m)} />
              ))}
            </View>
            <Text style={{ color: colors.text, fontWeight: '700' }}>3. {t('w.stepShot')}</Text>
            {shot ? (
              <View style={{ gap: 8, alignItems: 'flex-start' }}>
                <Image source={{ uri: shot.preview }} style={styles.shot} resizeMode="contain" />
                <Button title={t('w.changeShot')} icon="image-edit" variant="outline" onPress={addShot} />
              </View>
            ) : (
              <Pressable onPress={addShot} disabled={shotBusy} style={styles.shotPick} accessibilityRole="button">
                {shotBusy ? <ActivityIndicator color={colors.primary} /> : <MaterialCommunityIcons name="cellphone-screenshot" size={36} color={colors.primary} />}
                <Text style={{ color: colors.primary, fontWeight: '800' }}>{t('w.addShot')}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center' }}>{t('w.shotHint')}</Text>
              </Pressable>
            )}
            <Field label={t('w.senderNameOpt')} value={senderName} onChangeText={setSenderName} placeholder={t('w.senderNamePh')} />
            <Field label={t('w.comment')} value={comment} onChangeText={setComment} placeholder={t('w.commentPh')} />
            {msg && <Text style={{ color: msg.ok ? colors.success : colors.danger, fontWeight: '600' }}>{msg.text}</Text>}
            <Button title={t('w.send')} icon="send" disabled={busy || num < 50 || !shot} onPress={submit} />
          </Card>
        )}

        <ChatButton compact q={t('chat.q.topup')} />
        {tops.length > 0 && <SectionTitle>{t('w.requests')}</SectionTitle>}
        {tops.map((r) => (
          <View key={r.id} style={styles.row}>
            <Text style={{ flex: 1, color: colors.text, fontWeight: '700' }}>
              {r.code ? `${r.code} · ` : ''}
              {fmtSom(r.amount)} · {r.method}
            </Text>
            <Text style={{ color: ST_COLOR[r.status], fontWeight: '800' }}>{t(`w.st.${r.status}` as TKey)}</Text>
          </View>
        ))}
        {topMore && (
          <Button
            title={moreBusy ? '…' : t('w.more')}
            variant="outline"
            disabled={moreBusy}
            onPress={async () => {
              setMoreBusy(true);
              const more = await fetchTopups({ userId: profile?.id, before: tops[tops.length - 1]?.createdAt, limit: 20 }).catch(() => []);
              setTops((l) => [...l, ...more]);
              setTopMore(more.length >= 20);
              setMoreBusy(false);
            }}
          />
        )}

        {tx.length > 0 && <SectionTitle>{t('w.history')}</SectionTitle>}
        {tx.map((x) => (
          <View key={x.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{t(`w.kind.${x.kind}` as TKey)}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {fmt(x.createdAt)}
                {x.note ? ` · ${x.note}` : ''}
              </Text>
            </View>
            <Text style={{ fontWeight: '900', color: x.amount > 0 ? colors.success : colors.danger }}>
              {x.amount > 0 ? '+' : ''}
              {fmtSom(x.amount)}
            </Text>
          </View>
        ))}
        {txMore && (
          <Button
            title={moreBusy ? '…' : t('w.more')}
            variant="outline"
            disabled={moreBusy}
            onPress={async () => {
              setMoreBusy(true);
              const more = await fetchTx(undefined, tx[tx.length - 1]?.createdAt).catch(() => []);
              setTx((l) => [...l, ...more]);
              setTxMore(more.length >= PAGE);
              setMoreBusy(false);
            }}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function WalletScreen() {
  return (
    <RequireAccount next="/wallet">
      <Wallet />
    </RequireAccount>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.primary, borderRadius: radius.lg, padding: 18 },
  balance: { color: '#fff', fontSize: 30, fontWeight: '900' },
  note: { flexDirection: 'row', gap: 10, backgroundColor: '#FEF3C7', borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: '#F59E0B' },
  info: { backgroundColor: colors.bg, borderRadius: radius.md, padding: 12, fontSize: 15, fontWeight: '700', color: colors.text, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border },
  shot: { width: 200, height: 300, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  shotPick: { alignItems: 'center', gap: 6, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.lg, padding: 20, backgroundColor: '#F0FDF4' },
  codeBox: { alignSelf: 'center', backgroundColor: '#ECFDF5', borderRadius: radius.lg, paddingHorizontal: 28, paddingVertical: 12, borderWidth: 2, borderColor: colors.primary, borderStyle: 'dashed' },
  code: { fontSize: 40, fontWeight: '900', color: colors.primary, letterSpacing: 4 },
  receipt: { width: 48, height: 48, borderRadius: 8 },
});
