import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RequireAccount } from '../../components/account/RequireAccount';
import { PopIn } from '../../components/anim';
import { BIKE_IMAGE, BIKE_RATIO } from '../../components/BikeRide';
import { Button, Field, QtyStepper } from '../../components/ui';
import { SHOP } from '../../config/shop';
import { colors } from '../../config/theme';
import { docsReady, useAccount } from '../../context/AccountContext';
import { useContent } from '../../context/ContentContext';
import { periodsOf, priceFor, RentPeriod } from '../../data/rentals';
import { TKey, useT } from '../../i18n';
import { track } from '../../lib/analytics';
import { formatPrice, openWhatsApp } from '../../lib/format';
import { getLocationOnce, mapLink, submitRentRequest } from '../../lib/rentRequests';

const UNIT: Record<RentPeriod, TKey> = { day: 'rent.unit.day', week: 'rent.unit.week', month: 'rent.unit.month' };
const TITLE: Record<RentPeriod, TKey> = { day: 'rent.tariff.day', week: 'rent.tariff.week', month: 'rent.tariff.month' };

function Checkout() {
  const { t } = useT();
  const params = useLocalSearchParams<{ bike: string; period?: string }>();
  const { rentals } = useContent();
  const { profile } = useAccount();
  const bike = rentals.find((b) => b.id === params.bike);
  const periods = bike ? periodsOf(bike) : [];
  const period: RentPeriod = periods.includes(params.period as RentPeriod) ? (params.period as RentPeriod) : periods[0] ?? 'day';
  const [count, setCount] = useState(1);
  const [start, setStart] = useState('');
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<null | { gps: boolean }>(null);

  if (!bike || !profile) return null;
  const unitPrice = priceFor(bike, period);
  const total = unitPrice ? unitPrice * count : 0;
  const ready = docsReady(profile);
  const valid = ready && consent && bike.available && profile.fullName.trim().length > 1;

  const submit = async () => {
    if (sending) return;
    setSending(true);
    setError(null);
    const loc = await getLocationOnce();
    try {
      await submitRentRequest({
        bikeId: bike.id,
        bikeName: bike.name,
        period,
        count,
        total: total || undefined,
        startText: start.trim(),
        name: profile.fullName.trim(),
        phone: profile.phone,
        passport: profile.passportNo.trim().toUpperCase(),
        lat: loc?.lat,
        lng: loc?.lng,
        accuracy: loc?.accuracy,
        userId: profile.id,
      });
    } catch {
      setError(t('rent.error'));
      setSending(false);
      return;
    }
    const periodText = `${count} ${t(UNIT[period])}${unitPrice ? ` × ${formatPrice(unitPrice)}` : ''}`;
    // Паспорт жана документтер WhatsApp'ка жиберилбейт — алар админ панелде гана
    const msg = [
      t('msg.rent'),
      '',
      t('msg.rentBike', { v: bike.name }),
      t('msg.rentPeriod', { v: periodText }),
      start.trim() ? t('msg.rentStart', { v: start.trim() }) : null,
      total ? t('msg.rentTotal', { v: formatPrice(total) }) : null,
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
              <Text style={styles.muted}>
                {t(TITLE[period])} · {unitPrice ? formatPrice(unitPrice) : ''}
              </Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={[styles.text, { flex: 1 }]}>{t('rent.count', { unit: t(UNIT[period]) })}</Text>
            <QtyStepper value={count} onChange={setCount} />
          </View>
          <Field label={t('rent.start')} value={start} onChangeText={setStart} placeholder={t('rent.startPh')} />
          {!!total && (
            <View style={[styles.row, styles.totalRow]}>
              <Text style={styles.title}>{t('rent.total')}</Text>
              <Text style={[styles.title, { color: colors.primary }]}>{formatPrice(total)}</Text>
            </View>
          )}
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

        <Pressable style={styles.consent} onPress={() => setConsent(!consent)} accessibilityRole="checkbox" accessibilityState={{ checked: consent }}>
          <MaterialCommunityIcons name={consent ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={consent ? colors.primary : colors.muted} />
          <Text style={[styles.text, { flex: 1, lineHeight: 20 }]}>{t('rent.consent')}</Text>
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

export default function RentCheckout() {
  const { t } = useT();
  const params = useLocalSearchParams<{ bike: string; period?: string }>();
  return (
    <>
      <Stack.Screen options={{ title: t('rent.checkout') }} />
      <RequireAccount next={`/rental/checkout?bike=${encodeURIComponent(params.bike ?? '')}&period=${params.period ?? ''}`}>
        <Checkout />
      </RequireAccount>
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
