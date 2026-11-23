import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useAccount } from '../../context/AccountContext';
import { createRepair, myMasterId } from '../../lib/repairs';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const params = useLocalSearchParams<{ master?: string }>();
  useEffect(() => {
    if (params.master && masters.some((m) => m.id === params.master)) chooseMaster(params.master);
  }, [params.master, masters.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const chooseMaster = (id: string | null) => {
    setMasterId(id);
    const m = masters.find((x) => x.id === id);
    const i = m ? branches.findIndex((b) => b.name === m.branch) : -1;
    if (i >= 0) setBranchIdx(i);
  };
  const [outcall, setOutcall] = useState(false);
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
  // Кирген колдонуучу мастер болсо — мастер панелине баскыч
  const { profile } = useAccount();
  const [isMaster, setIsMaster] = useState(false);
  useEffect(() => {
    if (!profile) return setIsMaster(false);
    myMasterId(profile.id).then((m) => setIsMaster(!!m)).catch(() => setIsMaster(false));
  }, [profile]);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const valid = name.trim().length > 1 && phone.replace(/\D/g, '').length >= 9 && (selected.length > 0 || problem.trim().length > 3);

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
    }).catch(() => 'error' as const);
    setSending(false);
    if (res === 'blocked') {
      setError(t('checkout.blocked'));
      return;
    }
    // Өтүнмө тандалган точканын өз номерине да кетет
    openWhatsApp(msg, branch?.whatsapp).catch(() => {});
    track('repair', undefined, branch?.name);
    setSent(true);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 96 }} keyboardShouldPersistTaps="handled">
        {isMaster && (
          <Pressable style={styles.masterBtn} onPress={() => router.push('/master-panel')} accessibilityRole="button">
            <MaterialCommunityIcons name="account-hard-hat" size={24} color="#fff" />
            <Text style={{ flex: 1, color: '#fff', fontWeight: '800', fontSize: 16 }}>{t('mp.title')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#fff" />
          </Pressable>
        )}
        <Card style={styles.banner}>
          <MaterialCommunityIcons name="tools" size={32} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{t('repair.title')}</Text>
            <Text style={{ color: colors.primarySoft }}>{t('repair.subtitle')}</Text>
          </View>
        </Card>
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

        {masters.some((m) => m.active) && (
          <>
            <SectionTitle>{t('masters.title')}</SectionTitle>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: -4 }}>{t('masters.choose')}</Text>
            <MastersList masters={masters} selectedId={masterId} onSelect={chooseMaster} />
          </>
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

        <SectionTitle>{t('repair.book')}</SectionTitle>
        {sent ? (
          <Card style={{ alignItems: 'center', gap: 10 }}>
            <PopIn>
              <MaterialCommunityIcons name="check-circle" size={48} color={colors.success} />
            </PopIn>
            <Text style={{ fontSize: 16, fontWeight: '700', textAlign: 'center' }}>{t('repair.sent')}</Text>
            <Button
              title={t('repair.new')}
              variant="outline"
              onPress={() => {
                setSent(false);
                setSelected([]);
                setProblem('');
              }}
            />
          </Card>
        ) : (
          <Card style={{ gap: 12 }}>
            <Field label={t('common.name')} value={name} onChangeText={setName} placeholder={t('repair.namePh')} />
            <Field label={t('common.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600' }}>{t('branch.repair')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {branches.map((b, i) => (
                  <Chip key={b.name + i} label={`📍 ${branchLabel(b, t)}`} active={branchIdx === i} onPress={() => setBranchIdx(i)} />
                ))}
              </View>
            </View>
            <Field label={t('repair.bike')} value={bike} onChangeText={setBike} placeholder={t('repair.bikePh')} />
            {outcallAvailable && (
              <Pressable style={styles.outcall} onPress={() => setOutcall(!outcall)} accessibilityRole="checkbox" accessibilityState={{ checked: outcall }}>
                <MaterialCommunityIcons name={outcall ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={outcall ? colors.primary : colors.muted} />
                <MaterialCommunityIcons name="car-side" size={20} color={colors.primary} />
                <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>
                  {t('masters.outcallAsk')}
                  {master?.outcallNote ? `\n${master.outcallNote}` : ''}
                </Text>
              </Pressable>
            )}
            <Pressable onPress={() => router.push({ pathname: '/chat', params: { q: t('chat.q.outcall') } })} accessibilityRole="link">
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('chat.askOutcall')}</Text>
            </Pressable>
            <Field label={t('repair.problem')} value={problem} onChangeText={setProblem} multiline placeholder={t('repair.problemPh')} />
            {error && <Text style={{ color: colors.danger, textAlign: 'center', fontWeight: '600' }}>{error}</Text>}
            <Button title={t('repair.send')} icon="whatsapp" variant="whatsapp" disabled={!valid || sending} onPress={submit} />
            <Button title={t('repair.call')} icon="phone" variant="outline" onPress={callShop} />
          </Card>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primary, borderColor: colors.primary },
  bannerTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  service: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border },
  serviceOn: { borderColor: colors.primary, backgroundColor: '#F0FDFA' },
  outcall: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primarySoft, borderRadius: 14, padding: 12 },
  masterBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#B45309', borderRadius: 16, padding: 14 },
  masterLink: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: '#B45309', backgroundColor: '#FFFBEB' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primarySoft, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.primary },
  ctaTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  serviceTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
});
