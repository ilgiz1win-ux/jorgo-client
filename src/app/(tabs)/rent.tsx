import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { PopIn } from '../../components/anim';
import { BIKE_IMAGE, BIKE_RATIO } from '../../components/BikeRide';
import { Button, Card, Chip, Field, QtyStepper, SectionTitle } from '../../components/ui';
import { SHOP } from '../../config/shop';
import { colors, radius } from '../../config/theme';
import { useContent } from '../../context/ContentContext';
import { periodsOf, priceFor, RentalBike, RentPeriod } from '../../data/rentals';
import { TKey, useT } from '../../i18n';
import { track } from '../../lib/analytics';
import { formatPrice, openWhatsApp } from '../../lib/format';

const PER: Record<RentPeriod, TKey> = { day: 'rent.perDay', week: 'rent.perWeek', month: 'rent.perMonth' };
const UNIT: Record<RentPeriod, TKey> = { day: 'rent.unit.day', week: 'rent.unit.week', month: 'rent.unit.month' };

function BikeCard({ bike, selected, onSelect }: { bike: RentalBike; selected: boolean; onSelect: () => void }) {
  const { t } = useT();
  return (
    <Card style={[styles.bike, selected && styles.bikeOn]}>
      <View style={styles.photo}>
        {bike.imageUrl ? (
          <Image source={{ uri: bike.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={bike.name} />
        ) : (
          <Image source={BIKE_IMAGE} style={{ width: '70%', aspectRatio: BIKE_RATIO }} resizeMode="contain" />
        )}
        <View style={[styles.status, { backgroundColor: bike.available ? colors.success : colors.muted }]}>
          <Text style={styles.statusText}>{bike.available ? t('rent.available') : t('rent.busy')}</Text>
        </View>
      </View>
      <Text style={styles.name}>{bike.name}</Text>
      <View style={styles.prices}>
        {periodsOf(bike).map((p) => (
          <View key={p} style={styles.price}>
            <Text style={styles.priceValue}>{formatPrice(priceFor(bike, p)!)}</Text>
            <Text style={styles.priceUnit}>{t(PER[p])}</Text>
          </View>
        ))}
      </View>
      {!!bike.deposit && <Text style={styles.muted}>{t('rent.deposit', { sum: formatPrice(bike.deposit) })}</Text>}
      {!!bike.description && <Text style={styles.desc}>{bike.description}</Text>}
      {bike.specs.length > 0 && (
        <View style={{ gap: 4 }}>
          {bike.specs.map(([k, v]) => (
            <View key={k} style={styles.spec}>
              <Text style={styles.muted}>{k}</Text>
              <Text style={styles.specValue}>{v}</Text>
            </View>
          ))}
        </View>
      )}
      {bike.available && (
        <Button
          title={selected ? t('rent.chosen') : t('rent.choose')}
          icon={selected ? 'check-circle' : 'bicycle-electric'}
          variant={selected ? 'primary' : 'outline'}
          onPress={onSelect}
        />
      )}
    </Card>
  );
}

export default function Rent() {
  const { t } = useT();
  const { rentals, rentTerms } = useContent();
  const available = useMemo(() => rentals.filter((b) => b.available), [rentals]);
  const [bikeId, setBikeId] = useState<string | null>(null);
  const [period, setPeriod] = useState<RentPeriod>('day');
  const [count, setCount] = useState(1);
  const [start, setStart] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+996 ');
  const [sent, setSent] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const formY = useRef(0);

  const bike = available.find((b) => b.id === bikeId) ?? available[0];
  const periods = bike ? periodsOf(bike) : [];

  // Тандалган велосипедде бул мөөнөт жок болсо, биринчисин коёбуз
  useEffect(() => {
    if (periods.length && !periods.includes(period)) setPeriod(periods[0]);
  }, [bike?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const unitPrice = bike ? priceFor(bike, period) : undefined;
  const total = unitPrice ? unitPrice * count : 0;
  const valid = !!bike && name.trim().length > 1 && phone.replace(/\D/g, '').length >= 9;
  const terms = rentTerms.text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const choose = (id: string) => {
    setBikeId(id);
    setTimeout(() => scroll.current?.scrollTo({ y: formY.current, animated: true }), 50);
  };

  const submit = () => {
    if (!bike) return;
    const periodText = `${count} ${t(UNIT[period])}${unitPrice ? ` × ${formatPrice(unitPrice)}` : ''}`;
    const msg = [
      t('msg.rent'),
      '',
      t('msg.rentBike', { v: bike.name }),
      t('msg.rentPeriod', { v: periodText }),
      start.trim() ? t('msg.rentStart', { v: start.trim() }) : null,
      total ? t('msg.rentTotal', { v: formatPrice(total) }) : null,
      '',
      t('msg.name', { v: name.trim() }),
      t('msg.phone', { v: phone.trim() }),
    ]
      .filter((x) => x !== null)
      .join('\n');
    track('rent');
    setSent(true);
    setTimeout(() => openWhatsApp(msg, SHOP.rentWhatsapp).catch(() => {}), 300);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 96 }} keyboardShouldPersistTaps="handled">
        <View style={styles.banner}>
          <Image source={BIKE_IMAGE} style={styles.bannerBike} resizeMode="contain" />
          <Text style={styles.bannerTitle}>{t('rent.title')}</Text>
          <Text style={styles.bannerText}>{t('rent.subtitle')}</Text>
        </View>

        <SectionTitle>{t('rent.bikes')}</SectionTitle>
        {rentals.length === 0 || available.length === 0 ? (
          <Card style={{ gap: 12, alignItems: 'center' }}>
            <MaterialCommunityIcons name="bicycle-electric" size={40} color={colors.muted} />
            <Text style={[styles.muted, { textAlign: 'center' }]}>{t('rent.empty')}</Text>
            <Button title={t('rent.ask')} icon="whatsapp" variant="whatsapp" onPress={() => openWhatsApp(t('msg.rent'), SHOP.rentWhatsapp).catch(() => {})} />
          </Card>
        ) : null}
        {rentals.map((b) => (
          <BikeCard key={b.id} bike={b} selected={bike?.id === b.id && !!bikeId} onSelect={() => choose(b.id)} />
        ))}

        {terms.length > 0 && (
          <Card style={{ gap: 8 }}>
            <Text style={styles.h}>{t('rent.terms')}</Text>
            {terms.map((l, i) => (
              <View key={i} style={styles.term}>
                <MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.termText}>{l}</Text>
              </View>
            ))}
          </Card>
        )}

        {bike && (
          <View onLayout={(e) => (formY.current = e.nativeEvent.layout.y)} style={{ gap: 12 }}>
            <SectionTitle>{t('rent.form')}</SectionTitle>
            {sent ? (
              <Card style={{ alignItems: 'center', gap: 10 }}>
                <PopIn>
                  <MaterialCommunityIcons name="check-circle" size={48} color={colors.success} />
                </PopIn>
                <Text style={{ fontSize: 16, fontWeight: '700', textAlign: 'center' }}>{t('rent.sent')}</Text>
              </Card>
            ) : (
              <Card style={{ gap: 14 }}>
                {available.length > 1 && (
                  <View style={{ gap: 6 }}>
                    <Text style={styles.label}>{t('rent.bike')}</Text>
                    <View style={styles.chips}>
                      {available.map((b) => (
                        <Chip key={b.id} label={b.name} active={bike.id === b.id} onPress={() => setBikeId(b.id)} />
                      ))}
                    </View>
                  </View>
                )}
                {periods.length > 0 && (
                  <View style={{ gap: 6 }}>
                    <Text style={styles.label}>{t('rent.period')}</Text>
                    <View style={styles.chips}>
                      {periods.map((p) => (
                        <Chip key={p} label={`${formatPrice(priceFor(bike, p)!)} ${t(PER[p])}`} active={period === p} onPress={() => setPeriod(p)} />
                      ))}
                    </View>
                  </View>
                )}
                <View style={styles.countRow}>
                  <Text style={[styles.label, { flex: 1 }]}>{t('rent.count', { unit: t(UNIT[period]) })}</Text>
                  <QtyStepper value={count} onChange={setCount} />
                </View>
                <Field label={t('rent.start')} value={start} onChangeText={setStart} placeholder={t('rent.startPh')} />
                <Field label={t('common.name')} value={name} onChangeText={setName} placeholder={t('checkout.namePh')} />
                <Field label={t('common.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                {!!total && (
                  <View style={styles.totalRow}>
                    <Text style={styles.h}>{t('rent.total')}</Text>
                    <Text style={[styles.h, { color: colors.primary }]}>{formatPrice(total)}</Text>
                  </View>
                )}
                {!!bike.deposit && <Text style={styles.muted}>{t('rent.deposit', { sum: formatPrice(bike.deposit) })}</Text>}
                <Button title={t('rent.send')} icon="whatsapp" variant="whatsapp" disabled={!valid} onPress={submit} />
                {!valid && <Text style={[styles.muted, { textAlign: 'center' }]}>{t('checkout.fill')}</Text>}
              </Card>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: 18, paddingTop: 96, gap: 6, overflow: 'hidden' },
  bannerBike: { position: 'absolute', right: -10, top: 8, width: 170, height: 170 / BIKE_RATIO },
  bannerTitle: { color: '#fff', fontSize: 22, fontWeight: '900' },
  bannerText: { color: '#D1D5DB', fontSize: 14 },
  bike: { gap: 10 },
  bikeOn: { borderColor: colors.primary, borderWidth: 2 },
  photo: { height: 190, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  status: { position: 'absolute', top: 10, left: 10, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  name: { fontSize: 18, fontWeight: '800', color: colors.text },
  prices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  price: { backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  priceValue: { fontSize: 16, fontWeight: '900', color: colors.primary },
  priceUnit: { fontSize: 12, color: colors.muted },
  desc: { fontSize: 14, lineHeight: 20, color: colors.text },
  spec: { flexDirection: 'row', justifyContent: 'space-between' },
  specValue: { color: colors.text, fontWeight: '600' },
  muted: { color: colors.muted, fontSize: 13 },
  h: { fontSize: 16, fontWeight: '800', color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  term: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  termText: { flex: 1, color: colors.text, lineHeight: 20 },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
});
