import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RequireAccount } from '../components/account/RequireAccount';
import { Button, Card, Chip, Field, SectionTitle } from '../components/ui';
import { colors, radius } from '../config/theme';
import { useAccount } from '../context/AccountContext';
import { TKey, useT } from '../i18n';
import { fetchTopups, fetchTx, fmtSom, getWalletSettings, myBalance, pickReceipt, sendTopup, Topup, WalletSettings, WalletTx, DEFAULT_WALLET } from '../lib/wallet';

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
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('1000');
  const [method, setMethod] = useState(METHODS[0]);
  const [comment, setComment] = useState('');
  const [receipt, setReceipt] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, c, x, tp] = await Promise.all([myBalance(), getWalletSettings(), fetchTx(), fetchTopups()]);
      setBalance(b);
      setCfg(c);
      setTx(x);
      setTops(tp.filter((v) => !profile || v.userId === profile.id || v.userId.startsWith('local-')));
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
    setBusy(true);
    setMsg(null);
    try {
      await sendTopup({ amount: num, method, comment, receipt });
      setComment('');
      setReceipt(undefined);
      setMsg({ ok: true, text: t('w.sent') });
      load();
    } catch {
      setMsg({ ok: false, text: t('chat.error') });
    }
    setBusy(false);
  };
  const addReceipt = async () => {
    if (!profile) return;
    try {
      const r = await pickReceipt(profile.id);
      if (r) setReceipt(r);
    } catch {
      setMsg({ ok: false, text: t('repair.photoErr') });
    }
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
        <Card style={{ gap: 12 }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>1. {t('w.step1')}</Text>
          <Text selectable style={styles.info}>{cfg.topupInfo}</Text>
          <Text style={{ color: colors.text, fontWeight: '700' }}>2. {t('w.step2')}</Text>
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
          <Field label={t('w.comment')} value={comment} onChangeText={setComment} placeholder={t('w.commentPh')} />
          {receipt ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {receipt.startsWith('data:') ? <Image source={{ uri: receipt }} style={styles.receipt} /> : <MaterialCommunityIcons name="receipt" size={28} color={colors.success} />}
              <Text style={{ color: colors.success, fontWeight: '700', flex: 1 }}>{t('w.receiptOk')}</Text>
            </View>
          ) : (
            <Button title={t('w.receipt')} icon="camera" variant="outline" onPress={addReceipt} />
          )}
          {msg && <Text style={{ color: msg.ok ? colors.success : colors.danger, fontWeight: '600' }}>{msg.text}</Text>}
          <Button title={t('w.send')} icon="send" disabled={busy || num < 50} onPress={submit} />
        </Card>

        {tops.length > 0 && <SectionTitle>{t('w.requests')}</SectionTitle>}
        {tops.slice(0, 10).map((r) => (
          <View key={r.id} style={styles.row}>
            <Text style={{ flex: 1, color: colors.text, fontWeight: '700' }}>
              {fmtSom(r.amount)} · {r.method}
            </Text>
            <Text style={{ color: ST_COLOR[r.status], fontWeight: '800' }}>{t(`w.st.${r.status}` as TKey)}</Text>
          </View>
        ))}

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
  receipt: { width: 48, height: 48, borderRadius: 8 },
});
