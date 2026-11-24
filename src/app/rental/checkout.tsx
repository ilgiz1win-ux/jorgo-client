import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LoginForm } from '../../components/account/LoginForm';
import { RentOnboarding, RentSteps } from '../../components/account/RentOnboarding';
import { PopIn } from '../../components/anim';
import { BIKE_IMAGE, BIKE_RATIO } from '../../components/BikeRide';
import { Button, Field } from '../../components/ui';
import { SHOP } from '../../config/shop';
import { colors } from '../../config/theme';
import { docsReady, useAccount } from '../../context/AccountContext';
import { useContent } from '../../context/ContentContext';
import { dailyPrice, RENT_MIN_DAYS } from '../../data/rentals';
import { myBalance } from '../../lib/wallet';
import { useT } from '../../i18n';
import { track } from '../../lib/analytics';
import { formatPrice, openWhatsApp } from '../../lib/format';
import { getLocationOnce, mapLink, submitRentRequest } from '../../lib/rentRequests';


function Checkout() {
  const { t } = useT();
  const params = useLocalSearchParams<{ bike: string; period?: string }>();
  const { rentals } = useContent();
  const { profile } = useAccount();
  const bike = rentals.find((b) => b.id === params.bike);
  const daily = bike ? dailyPrice(bike) : undefined;
  const minTotal = daily ? daily * RENT_MIN_DAYS : 0;
  const [balance, setBalance] = useState<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      myBalance().then(setBalance).catch(() => setBalance(null));
    }, []),
  );
  const [start, setStart] = useState('');
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<null | { gps: boolean }>(null);

  if (!bike || !profile) return null;
  const ready = docsReady(profile);
  const enough = balance !== null && balance >= minTotal;
  const valid = ready && consent && bike.available && !!daily && enough && profile.fullName.trim().length > 1;

  const submit = async () => {
    if (sending) return;
    setSending(true);
    setError(null);
    const loc = await getLocationOnce();
    try {
      await submitRentRequest({
        bikeId: bike.id,
        bikeName: bike.name,
        period: 'day',
        count: RENT_MIN_DAYS,
        total: minTotal || undefined,
        dailyPrice: daily,
        startText: start.trim(),
        name: profile.fullName.trim(),
        phone: profile.phone,
        passport: profile.passportNo.trim().toUpperCase(),
        lat: loc?.lat,
        lng: loc?.lng,
        accuracy: loc?.accuracy,
        userId: profile.id,
      });
    } catch (e) {
      const m = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? '');
      setError(
        /row-level security/i.test(m)
          ? t('checkout.blocked')
          : m === 'rent_low_balance'
            ? t('rd.low', { v: formatPrice(minTotal) })
            : m === 'rent_no_price'
              ? t('rd.noPrice')
              : t('rent.error'),
      );
      setSending(false);
      return;
    }
    const periodText = t('rd.perDay', { v: formatPrice(daily ?? 0) });
    // Паспорт жана документтер WhatsApp'ка жиберилбейт — алар админ панелде гана
    const msg = [
      t('msg.rent'),
      '',
      t('msg.rentBike', { v: bike.name }),
      t('msg.rentPeriod', { v: periodText }),
      start.trim() ? t('msg.rentStart', { v: start.trim() }) : null,
      minTotal ? t('rd.msgMin', { v: formatPrice(minTotal) }) : null,
      '',
      t('msg.name', { v: profile.fullName.trim() }),
      t('msg.phone', { v: profile.phone }),
      t('msg.rentPassport'),
      loc ? t('msg.rentGps', { v: mapLink(loc.lat, loc.lng) }) : null,
    ]
      .filter((x) => x !== null)
      .join('\n');
    track('rent');
    setSending(false);
    setSent({ gps: !!loc });
    setTimeout(() => openWhatsApp(msg, SHOP.rentWhatsapp).catch(() => {}), 300);
  };

  if (sent) {
    return (
      <View style={styles.done}>
        <PopIn>
          <MaterialCommunityIcons name="check-circle" size={72} color={colors.success} />
        </PopIn>
        <Text style={styles.doneTitle}>{t('rent.sent')}</Text>
        <Text style={{ color: sent.gps ? colors.success : colors.muted }}>{sent.gps ? t('rent.gpsOk') : t('rent.gpsNo')}</Text>
        <Button title={t('acc.myRents')} icon="bicycle-electric" onPress={() => router.replace('/account/rentals')} style={{ borderRadius: 999, alignSelf: 'stretch' }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>{t('rent.youRent').toUpperCase()}</Text>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <View style={styles.thumb}>
              {bike.imageUrl ? (
                <Image source={{ uri: bike.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <Image source={BIKE_IMAGE} style={{ width: '90%', aspectRatio: BIKE_RATIO }} resizeMode="contain" />
              )}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.title}>{bike.name}</Text>
              <Text style={[styles.muted, { color: colors.primary, fontWeight: '800', fontSize: 15 }]}>{daily ? t('rd.perDay', { v: formatPrice(daily) }) : t('rd.noPrice')}</Text>
            </View>
          </View>
          <Field label={t('rent.start')} value={start} onChangeText={setStart} placeholder={t('rent.startPh')} />
          {!!daily && (
            <View style={[styles.row, styles.totalRow]}>
              <Text style={[styles.text, { flex: 1 }]}>{t('rd.minWeek', { n: RENT_MIN_DAYS })}</Text>
              <Text style={[styles.title, { color: colors.primary }]}>{formatPrice(minTotal)}</Text>
            </View>
          )}
          <Text style={styles.muted}>{t('rd.howBilled')}</Text>
          {!!bike.deposit && <Text style={styles.muted}>{t('rent.deposit', { sum: formatPrice(bike.deposit) })}</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t('rent.contact').toUpperCase()}</Text>
          <Pressable style={styles.line} onPress={() => router.push('/account/profile')}>
            <MaterialCommunityIcons name="account-outline" size={20} color={colors.primary} />
            <Text style={[styles.text, { flex: 1 }]}>{profile.fullName || '—'}</Text>
            <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.muted} />
          </Pressable>
          <View style={styles.line}>
            <MaterialCommunityIcons name="phone-outline" size={20} color={colors.primary} />
            <Text style={styles.text}>{profile.phone}</Text>
          </View>
          <Pressable style={styles.line} onPress={() => router.push('/account/documents')}>
            <MaterialCommunityIcons name={ready ? 'shield-check-outline' : 'alert-circle-outline'} size={20} color={ready ? colors.primary : colors.danger} />
            <Text style={[styles.text, { flex: 1, color: ready ? colors.text : colors.danger }]}>
              {ready ? `${t('acc.documents')}: ${profile.verified ? t('acc.verified') : t('acc.doc.done')}` : t('rent.docsNeeded')}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} />
          </Pressable>
          {!ready && <Button title={t('rent.docsGo')} icon="upload" variant="outline" onPress={() => router.push('/account/documents')} style={{ borderRadius: 999 }} />}
        </View>

        <View style={[styles.card, { gap: 10 }]}>
          <Text style={styles.label}>{t('w.balance').toUpperCase()}</Text>
          <Text style={[styles.title, { color: enough ? colors.success : colors.danger }]}>{balance === null ? '…' : formatPrice(balance)}</Text>
          {balance !== null && !enough && (
            <>
              <Text style={{ color: colors.danger, fontWeight: '700' }}>{t('rd.low', { v: formatPrice(minTotal) })}</Text>
              <Button title={t('w.go')} icon="wallet-plus" onPress={() => router.push('/wallet')} style={{ borderRadius: 999 }} />
            </>
          )}
        </View>

        <View style={[styles.card, { gap: 8, backgroundColor: '#FFFBEB', borderColor: '#F59E0B' }]}>
          <Text style={[styles.label, { color: '#92400E' }]}>{t('rd.rules').toUpperCase()}</Text>
          {(['rd.r1', 'rd.r2', 'rd.r3', 'rd.r4', 'rd.r5', 'rd.r9', 'rd.r6', 'rd.r7', 'rd.r8', 'rd.r10'] as const).map((k) => (
            <Text key={k} style={{ color: '#78350F', lineHeight: 20 }}>
              • {t(k, { n: RENT_MIN_DAYS, v: daily ? formatPrice(daily) : '' })}
            </Text>
          ))}
        </View>

        <Pressable style={styles.consent} onPress={() => setConsent(!consent)} accessibilityRole="checkbox" accessibilityState={{ checked: consent }}>
          <MaterialCommunityIcons name={consent ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={consent ? colors.primary : colors.muted} />
          <Text style={[styles.text, { flex: 1, lineHeight: 20 }]}>{t('rd.consent')}</Text>
        </Pressable>
        <View style={styles.line}>
          <MaterialCommunityIcons name="map-marker-radius" size={18} color={colors.primary} />
          <Text style={[styles.muted, { flex: 1 }]}>{t('rent.gpsNote')}</Text>
        </View>

        {error && <Text style={{ color: colors.danger }}>{error}</Text>}
        {sending ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: 14 }} />
        ) : (
          <Button title={t('rent.order')} icon="check-circle" disabled={!valid} onPress={submit} style={{ borderRadius: 999 }} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Ижараны тариздөө: 1) катталуу/кирүү 2) паспорт, документтер, туугандар 3) тариздөө
function Gate() {
  const { t } = useT();
  const { ready, profile } = useAccount();
  if (!ready) return <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />;
  if (!profile)
    return (
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <RentSteps step={1} />
        </View>
        <LoginForm onDone={() => {}} subtitle={t('rent.loginSub')} />
      </View>
    );
  if (!docsReady(profile)) return <RentOnboarding />;
  return <Checkout />;
}

export default function RentCheckout() {
  const { t } = useT();
  const params = useLocalSearchParams<{ bike: string; period?: string }>();
  return (
    <>
      <Stack.Screen options={{ title: t('rent.checkout') }} />
      <Gate />
    </>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 26, padding: 18, gap: 14, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 12, fontWeight: '800', color: colors.muted, letterSpacing: 1 },
  thumb: { width: 96, height: 72, borderRadius: 16, backgroundColor: '#F8FAF8', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  title: { fontSize: 18, fontWeight: '900', color: colors.text },
  text: { fontSize: 15, color: colors.text, fontWeight: '600' },
  muted: { fontSize: 13, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  totalRow: { justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  consent: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingHorizontal: 4 },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  doneTitle: { fontSize: 20, fontWeight: '900', color: colors.text, textAlign: 'center' },
});
