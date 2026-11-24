import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useIsMaster } from '../../hooks/useIsMaster';
import { useAccount } from '../../context/AccountContext';
import { DEFAULT_WALLET, fmtSom, getWalletSettings, myBalance } from '../../lib/wallet';
import * as ImagePicker from 'expo-image-picker';
import { createRepair, fmtVisit, uploadRepairPhoto } from '../../lib/repairs';
import { getLocationOnce, mapLink } from '../../lib/rentRequests';
import { PhotoStrip } from '../../components/repair/PhotoStrip';
import { VisitPicker } from '../../components/repair/VisitPicker';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PopIn } from '../../components/anim';
import { BeforeAfter } from '../../components/HomeSections';
import { MastersList } from '../../components/MastersList';
import { Button, Card, Chip, Field, SectionTitle } from '../../components/ui';
import { branchLabel } from '../../lib/branches';
import { useContent } from '../../context/ContentContext';
import { colors } from '../../config/theme';
import { useCatalog } from '../../context/CatalogContext';
import { callShop, openWhatsApp } from '../../lib/format';
import { useT } from '../../i18n';
import { track } from '../../lib/analytics';

export default function Repair() {
  const { t } = useT();
  const { services: SERVICES } = useCatalog();
  const { gallery, masters } = useContent();
  const [masterId, setMasterId] = useState<string | null>(null);
  const master = masters.find((m) => m.id === masterId);
  // «Биздин мастерлер» барагынан мастер тандалып келсе
  const params = useLocalSearchParams<{ master?: string; mode?: string }>();
  // Эки жол: 🚗 выезд (мастер өзү келет) же 🏪 точкага алып келүү
  const [mode, setMode] = useState<'outcall' | 'shop'>(params.mode === 'shop' ? 'shop' : 'outcall');
  useEffect(() => {
    if (params.mode === 'shop' || params.mode === 'outcall') setMode(params.mode);
  }, [params.mode]);
  useEffect(() => {
    if (params.master && masters.some((m) => m.id === params.master)) chooseMaster(params.master);
  }, [params.master, masters.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const chooseMaster = (id: string | null) => {
    setMasterId(id);
    const m = masters.find((x) => x.id === id);
    const i = m ? branches.findIndex((b) => b.name === m.branch) : -1;
    if (i >= 0) setBranchIdx(i);
    // Тандалган мастер выездге чыкпаса — точка жолуна өтөбүз
    if (m && !m.outcall) setMode('shop');
  };
  const outcall = mode === 'outcall';
  const shownMasters = outcall ? masters.filter((m) => m.outcall) : masters;
  const switchMode = (m: 'outcall' | 'shop') => {
    setMode(m);
    if (m === 'outcall' && master && !master.outcall) setMasterId(null);
    setError(null);
  };
  const { branches } = useContent();
  const [branchIdx, setBranchIdx] = useState(0);
  const branch = branches[Math.min(branchIdx, branches.length - 1)] ?? branches[0];
  // Выезд: тандалган мастер чыкса, же мастер тандалбаса — кимдир бирөө чыкса
  const outcallAvailable = master ? master.outcall : masters.some((m) => m.active && m.outcall);
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+996 ');
  const [bike, setBike] = useState('');
  const [problem, setProblem] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [lastMsg, setLastMsg] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [visitAt, setVisitAt] = useState<string | undefined>();
  const [address, setAddress] = useState('');
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locBusy, setLocBusy] = useState(false);
  const addPhoto = async () => {
    if (photos.length >= 3) return;
    setError(null);
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, base64: true, allowsMultipleSelection: false });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    let b64 = a.base64 ?? '';
    let mime = a.mimeType ?? 'image/jpeg';
    if (!b64 && a.uri.startsWith('data:')) {
      const m = a.uri.match(/^data:([^;]+);base64,(.*)$/);
      if (m) [, mime, b64] = m;
    }
    if (!b64) return;
    setUploading(true);
    try {
      const url = await uploadRepairPhoto(b64, mime);
      setPhotos((p) => [...p, url].slice(0, 3));
    } catch {
      setError(t('repair.photoErr'));
    }
    setUploading(false);
  };
  const addLocation = async () => {
    setLocBusy(true);
    const l = await getLocationOnce();
    setLocBusy(false);
    if (l) setLoc({ lat: l.lat, lng: l.lng });
    else setError(t('repair.locErr'));
  };
  // Кирген колдонуучу мастер болсо — мастер панелине баскыч
  const isMaster = useIsMaster(true);
  // Выезд: аккаунт, баланс жана макулдук керек
  const { profile } = useAccount();
  const [fee, setFee] = useState(DEFAULT_WALLET.outcallFee);
  const [balance, setBalance] = useState<number | null>(null);
  const [agree, setAgree] = useState(false);
  useFocusEffect(
    useCallback(() => {
      getWalletSettings().then((c) => setFee(c.outcallFee)).catch(() => {});
      if (profile) myBalance().then(setBalance).catch(() => setBalance(null));
      else setBalance(null);
    }, [profile]),
  );

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const wantsOutcall = outcall && outcallAvailable;
  const outcallOk = !wantsOutcall || (!!profile && (balance ?? 0) >= fee && agree);
  const valid = name.trim().length > 1 && phone.replace(/\D/g, '').length >= 9 && (selected.length > 0 || problem.trim().length > 3) && outcallOk;

  const submit = async () => {
    const chosen = SERVICES.filter((s) => selected.includes(s.id));
    const services = chosen.map((s) => `• ${s.title}`);
    const number = String(Date.now()).slice(-6);
    const msg = [
      `${t('msg.repair')} №${number}`,
      '',
      t('msg.name', { v: name.trim() }),
      t('msg.phone', { v: phone.trim() }),
      bike.trim() ? t('msg.bike', { v: bike.trim() }) : null,
      branch ? t('msg.branch', { v: branchLabel(branch, t) }) : null,
      master ? t('msg.master', { v: master.name }) : null,
      outcall && outcallAvailable ? t('msg.outcall') : null,
      outcall && outcallAvailable && address.trim() ? t('msg.address', { v: address.trim() }) : null,
      outcall && outcallAvailable && loc ? `📍 ${mapLink(loc.lat, loc.lng)}` : null,
      visitAt ? t('msg.when', { v: fmtVisit(visitAt) }) : null,
      photos.length && !photos[0].startsWith('data:') ? `📷 ${photos.join('\n')}` : null,
      services.length ? `${t('msg.services')}\n${services.join('\n')}` : null,
      problem.trim() ? t('msg.problem', { v: problem.trim() }) : null,
    ]
      .filter(Boolean)
      .join('\n');
    // Өтүнмө базага жазылат: мастердин панелине (же точканын мастерлерине) түшөт
    setSending(true);
    setError(null);
    const res = await createRepair({
      number,
      name: name.trim(),
      phone: phone.trim(),
      bike: bike.trim(),
      services: chosen.map((s) => s.title),
      problem: problem.trim(),
      branch: branch?.name ?? '',
      masterId: master?.id,
      outcall: outcall && outcallAvailable,
      photos,
      address: outcall && outcallAvailable ? address.trim() : '',
      lat: outcall && outcallAvailable ? loc?.lat : undefined,
      lng: outcall && outcallAvailable ? loc?.lng : undefined,
      visitAt,
    }).catch(() => 'error' as const);
    setSending(false);
    if (res === 'blocked') {
      setError(t('checkout.blocked'));
      return;
    }
    if (res === 'login') {
      setError(t('w.needLogin'));
      return;
    }
    if (res === 'balance') {
      setError(t('w.low', { b: fmtSom(balance ?? 0), v: String(fee) }));
      return;
    }
    if (res === 'error') {
      setError(t('chat.error'));
      return;
    }
    if (wantsOutcall) myBalance().then(setBalance).catch(() => {});
    // Заказ базага жазылды: мастердин панелине түшөт, мастерге жана админге билдирме кетет.
    // WhatsApp'ка өзү өтпөйт — кааласа, кардар кийин өзү жаза алат.
    setLastMsg(msg);
    track('repair', undefined, branch?.name);
    setSent(true);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 96 }} keyboardShouldPersistTaps="handled">
        {isMaster && (
          <Pressable style={styles.masterBtn} onPress={() => router.push('/master')} accessibilityRole="button">
            <MaterialCommunityIcons name="account-hard-hat" size={24} color="#fff" />
            <Text style={{ flex: 1, color: '#fff', fontWeight: '800', fontSize: 16 }}>{t('mp.title')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#fff" />
          </Pressable>
        )}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {(['outcall', 'shop'] as const).map((m) => {
            const on = mode === m;
            return (
              <Pressable key={m} onPress={() => switchMode(m)} style={[styles.mode, on && styles.modeOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                <MaterialCommunityIcons name={m === 'outcall' ? 'car-side' : 'store'} size={30} color={on ? '#fff' : colors.primary} />
                <Text style={[styles.modeTitle, on && { color: '#fff' }]}>{m === 'outcall' ? t('rm.outcall') : t('rm.shop')}</Text>
                <Text style={[styles.modeSub, on && { color: colors.primarySoft }]}>{m === 'outcall' ? t('rm.outcallSub') : t('rm.shopSub')}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable style={styles.cta} onPress={() => router.push('/become-master')} accessibilityRole="button">
          <MaterialCommunityIcons name="account-hard-hat-outline" size={30} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.ctaTitle}>{t('ma.cta')}</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>{t('ma.ctaSub')}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primary} />
        </Pressable>
        {!isMaster && (
          <Pressable style={styles.masterLink} onPress={() => router.push('/master-panel')} accessibilityRole="button">
            <MaterialCommunityIcons name="account-hard-hat" size={20} color="#B45309" />
            <Text style={{ flex: 1, color: '#B45309', fontWeight: '800' }}>{t('mp.entry')}</Text>
            <MaterialCommunityIcons name="login" size={20} color="#B45309" />
          </Pressable>
        )}

        {shownMasters.some((m) => m.active) && (
          <>
            <SectionTitle>{outcall ? t('rm.outcallMasters') : t('masters.title')}</SectionTitle>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: -4 }}>{t('masters.choose')}</Text>
            <MastersList masters={shownMasters} selectedId={masterId} onSelect={chooseMaster} />
          </>
        )}
        {outcall && !outcallAvailable && (
          <View style={styles.feeBox}>
            <Text style={{ color: '#78350F', fontWeight: '700' }}>{t('rm.noOutcall')}</Text>
            <Button title={t('rm.shop')} icon="store" variant="outline" onPress={() => switchMode('shop')} />
          </View>
        )}

        <SectionTitle>{t('repair.services')}</SectionTitle>
        {SERVICES.map((s) => {
          const on = selected.includes(s.id);
          return (
            <Pressable key={s.id} onPress={() => toggle(s.id)} style={[styles.service, on && styles.serviceOn]}>
              <MaterialCommunityIcons name={s.icon} size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceTitle}>{s.title}</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>{s.price}</Text>
              </View>
              <MaterialCommunityIcons
                name={on ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                size={24}
                color={on ? colors.primary : colors.border}
              />
            </Pressable>
          );
        })}

        {gallery.length > 0 && (
          <>
            <SectionTitle>{t('repair.works')}</SectionTitle>
            {gallery.map((g) => (
              <BeforeAfter key={g.id} title={g.title} beforeUrl={g.beforeUrl} afterUrl={g.afterUrl} />
            ))}
          </>
        )}

        <SectionTitle>{outcall ? t('rm.bookOutcall') : t('repair.book')}</SectionTitle>
        {sent ? (
          <Card style={{ alignItems: 'center', gap: 10 }}>
            <PopIn>
              <MaterialCommunityIcons name="check-circle" size={48} color={colors.success} />
            </PopIn>
            <Text style={{ fontSize: 16, fontWeight: '700', textAlign: 'center' }}>{!profile ? t('repair.sent') : outcall ? t('rm.sentOutcall') : t('rm.sentShop')}</Text>
            {!!profile && <Button title={t('my.see')} icon="cart-check" onPress={() => router.push('/cart')} />}
            <Pressable onPress={() => openWhatsApp(lastMsg, branch?.whatsapp).catch(() => {})} accessibilityRole="link">
              <Text style={{ color: colors.muted, fontSize: 13, textDecorationLine: 'underline' }}>{t('rm.alsoWa')}</Text>
            </Pressable>
            <Button
              title={t('repair.new')}
              variant="outline"
              onPress={() => {
                setSent(false);
                setSelected([]);
                setProblem('');
                setPhotos([]);
                setVisitAt(undefined);
                setAddress('');
                setLoc(null);
              }}
            />
          </Card>
        ) : (
          <Card style={{ gap: 12 }}>
            <Field label={t('common.name')} value={name} onChangeText={setName} placeholder={t('repair.namePh')} />
            <Field label={t('common.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600' }}>{outcall ? t('rm.branchOutcall') : t('branch.repair')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {branches.map((b, i) => (
                  <Chip key={b.name + i} label={`📍 ${branchLabel(b, t)}`} active={branchIdx === i} onPress={() => setBranchIdx(i)} />
                ))}
              </View>
            </View>
            <Field label={t('repair.bike')} value={bike} onChangeText={setBike} placeholder={t('repair.bikePh')} />
            {outcall && !!master?.outcallNote && <Text style={{ color: colors.primary, fontWeight: '700' }}>🚗 {master.outcallNote}</Text>}
            {outcall && (
              <Pressable onPress={() => router.push({ pathname: '/chat', params: { q: t('chat.q.outcall') } })} accessibilityRole="link">
                <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('chat.askOutcall')}</Text>
              </Pressable>
            )}
            {wantsOutcall && (
              <View style={styles.feeBox}>
                <Text style={{ color: '#78350F', lineHeight: 20 }}>⚠️ {t('w.outcallInfo', { v: String(fee) })}</Text>
                {!profile ? (
                  <>
                    <Text style={{ color: colors.danger, fontWeight: '700' }}>{t('w.needLogin')}</Text>
                    <Button title={t('acc.signIn')} icon="login" onPress={() => router.push({ pathname: '/account/login', params: { next: '/repair?mode=outcall' } })} />
                  </>
                ) : (balance ?? 0) < fee ? (
                  <>
                    <Text style={{ color: colors.danger, fontWeight: '700' }}>{t('w.low', { b: fmtSom(balance ?? 0), v: String(fee) })}</Text>
                    <Button title={t('w.go')} icon="wallet-plus" onPress={() => router.push('/wallet')} />
                  </>
                ) : (
                  <>
                    <Text style={{ color: colors.success, fontWeight: '700' }}>{t('w.balance')}: {fmtSom(balance ?? 0)}</Text>
                    <Pressable onPress={() => setAgree(!agree)} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }} accessibilityRole="checkbox" accessibilityState={{ checked: agree }}>
                      <MaterialCommunityIcons name={agree ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={agree ? colors.primary : colors.muted} />
                      <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>{t('w.agree', { v: String(fee) })}</Text>
                    </Pressable>
                  </>
                )}
              </View>
            )}
            {outcall && outcallAvailable && (
              <View style={{ gap: 8 }}>
                <Field label={t('repair.address')} value={address} onChangeText={setAddress} placeholder={t('repair.addressPh')} />
                <Pressable onPress={addLocation} disabled={locBusy} style={styles.locBtn} accessibilityRole="button">
                  {locBusy ? <ActivityIndicator color={colors.primary} /> : <MaterialCommunityIcons name={loc ? 'map-marker-check' : 'crosshairs-gps'} size={20} color={colors.primary} />}
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>{loc ? t('repair.locationOk') : t('repair.myLocation')}</Text>
                </Pressable>
              </View>
            )}
            <VisitPicker value={visitAt} onChange={setVisitAt} labels={[t('repair.today'), t('repair.tomorrow'), t('repair.dayAfter')]} dayLabel={t('repair.when')} timeLabel={t('repair.whenTime')} />
            <Field label={t('repair.problem')} value={problem} onChangeText={setProblem} multiline placeholder={t('repair.problemPh')} />
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600' }}>{t('repair.photos')}</Text>
              <PhotoStrip photos={photos} size={76} onRemove={(i) => setPhotos((p) => p.filter((_, k) => k !== i))} />
              {photos.length < 3 && (
                <Pressable onPress={addPhoto} disabled={uploading} style={styles.locBtn} accessibilityRole="button">
                  {uploading ? <ActivityIndicator color={colors.primary} /> : <MaterialCommunityIcons name="camera-plus" size={20} color={colors.primary} />}
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('repair.addPhoto')}</Text>
                </Pressable>
              )}
            </View>
            {error && <Text style={{ color: colors.danger, textAlign: 'center', fontWeight: '600' }}>{error}</Text>}
            <Button title={outcall ? t('rm.submitOutcall') : t('rm.submitShop')} icon="check-circle" disabled={!valid || sending} onPress={submit} />
            <Button title={t('repair.call')} icon="phone" variant="outline" onPress={callShop} />
          </Card>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  service: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border },
  serviceOn: { borderColor: colors.primary, backgroundColor: '#F0FDFA' },
  masterBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#B45309', borderRadius: 16, padding: 14 },
  mode: { flex: 1, gap: 4, backgroundColor: colors.card, borderRadius: 18, padding: 14, borderWidth: 2, borderColor: colors.border },
  modeOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  modeSub: { fontSize: 12, color: colors.muted },
  feeBox: { gap: 10, backgroundColor: '#FEF3C7', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#F59E0B' },
  locBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  masterLink: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: '#B45309', backgroundColor: '#FFFBEB' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primarySoft, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.primary },
  ctaTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  serviceTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
});
