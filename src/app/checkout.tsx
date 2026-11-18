import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PopIn } from '../components/anim';
import { Button, Card, Chip, Field } from '../components/ui';
import { SHOP } from '../config/shop';
import { colors } from '../config/theme';
import { useCart } from '../context/CartContext';
import { formatPrice, openWhatsApp } from '../lib/format';
import { TKey, useT } from '../i18n';
import { track } from '../lib/analytics';

type Delivery = 'pickup' | 'courier';
type Payment = 'cash' | 'transfer' | 'installment';

const PAYMENTS: Payment[] = ['cash', 'transfer', 'installment'];

export default function Checkout() {
  const { t } = useT();
  const { lines, subtotal, clear, addOrder } = useCart();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+996 ');
  const [delivery, setDelivery] = useState<Delivery>('pickup');
  const [address, setAddress] = useState('');
  const [branchIdx, setBranchIdx] = useState(0);
  const branchName = (i: number) => t(`shop.branch.${i}` as TKey);
  const [payment, setPayment] = useState<Payment>('cash');
  const [comment, setComment] = useState('');
  const [done, setDone] = useState<string | null>(null);

  const deliveryFee = delivery === 'courier' && subtotal < SHOP.freeDeliveryFrom ? SHOP.deliveryFee : 0;
  const total = subtotal + deliveryFee;
  const phoneOk = phone.replace(/\D/g, '').length >= 9;
  const valid = name.trim().length > 1 && phoneOk && (delivery === 'pickup' || address.trim().length > 3);

  if (done) {
    return (
      <View style={styles.done}>
        <PopIn>
          <MaterialCommunityIcons name="check-decagram" size={80} color={colors.success} />
        </PopIn>
        <Text style={styles.doneTitle}>{t('checkout.done', { id: done })}</Text>
        <Text style={{ color: colors.muted, textAlign: 'center' }}>
          {t('checkout.doneText', { phone })}
        </Text>
        <Button title={t('checkout.home')} icon="home" onPress={() => router.replace('/')} />
      </View>
    );
  }

  if (!lines.length) {
    return (
      <View style={styles.done}>
        <Text style={{ color: colors.muted }}>{t('cart.empty')}</Text>
        <Button title={t('common.goCatalog')} onPress={() => router.replace('/catalog')} />
      </View>
    );
  }

  const submit = () => {
    const id = String(Date.now()).slice(-6);
    const itemsText = lines.map((l, i) => `${i + 1}. ${l.product.name} × ${l.qty} = ${formatPrice(l.product.price * l.qty)}`).join('\n');
    const msg = [
      t('msg.newOrder', { id }),
      '',
      itemsText,
      '',
      deliveryFee ? t('msg.delivery', { sum: formatPrice(deliveryFee) }) : null,
      t('msg.total', { sum: formatPrice(total) }),
      '',
      t('msg.name', { v: name.trim() }),
      t('msg.phone', { v: phone.trim() }),
      delivery === 'pickup' ? t('msg.pickup', { v: branchName(branchIdx) }) : t('msg.courier', { v: address.trim() }),
      t('msg.payment', { v: t(`pay.${payment}`) }),
      comment.trim() ? t('msg.comment', { v: comment.trim() }) : null,
    ]
      .filter((x) => x !== null)
      .join('\n');

    addOrder({
      id,
      date: new Date().toISOString(),
      items: lines.map((l) => ({ name: l.product.name, qty: l.qty, price: l.product.price })),
      total,
      customer: name.trim(),
      phone: phone.trim(),
    });
    track('order');
    clear();
    setDone(id);
    // Буйрутма сакталгандан кийин WhatsApp'ты ачабыз
    setTimeout(() => openWhatsApp(msg).catch(() => {}), 400);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 14 }}>
          <Text style={styles.h}>{t('checkout.contact')}</Text>
          <Field label={t('common.name')} value={name} onChangeText={setName} placeholder={t('checkout.namePh')} />
          <Field label={t('common.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+996 700 123 456" />
        </Card>

        <Card style={{ gap: 12 }}>
          <Text style={styles.h}>{t('checkout.method')}</Text>
          <View style={styles.chips}>
            <Chip label={t('checkout.pickup')} active={delivery === 'pickup'} onPress={() => setDelivery('pickup')} />
            <Chip label={t('checkout.courier')} active={delivery === 'courier'} onPress={() => setDelivery('courier')} />
          </View>
          {delivery === 'pickup' ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.muted, fontSize: 13 }}>{t('checkout.whichBranch', { city: SHOP.city })}</Text>
              <View style={styles.chips}>
                {SHOP.branches.map((b, i) => (
                  <Chip key={b} label={`📍 ${branchName(i)}`} active={branchIdx === i} onPress={() => setBranchIdx(i)} />
                ))}
              </View>
            </View>
          ) : (
            <Field label={t('checkout.address')} value={address} onChangeText={setAddress} placeholder={t('checkout.addressPh')} />
          )}
        </Card>

        <Card style={{ gap: 12 }}>
          <Text style={styles.h}>{t('checkout.payment')}</Text>
          <View style={styles.chips}>
            {PAYMENTS.map((p) => (
              <Chip key={p} label={t(`pay.${p}`)} active={payment === p} onPress={() => setPayment(p)} />
            ))}
          </View>
          <Field label={t('checkout.comment')} value={comment} onChangeText={setComment} multiline placeholder={t('checkout.commentPh')} />
        </Card>

        <Card style={{ gap: 8 }}>
          {lines.map((l) => (
            <View key={l.product.id} style={styles.row}>
              <Text style={{ flex: 1, color: colors.text }} numberOfLines={1}>
                {l.product.name} × {l.qty}
              </Text>
              <Text style={{ fontWeight: '600' }}>{formatPrice(l.product.price * l.qty)}</Text>
            </View>
          ))}
          <View style={styles.row}>
            <Text style={{ color: colors.muted }}>{t('checkout.delivery')}</Text>
            <Text style={{ fontWeight: '600' }}>{deliveryFee ? formatPrice(deliveryFee) : t('checkout.free')}</Text>
          </View>
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }]}>
            <Text style={styles.h}>{t('checkout.total')}</Text>
            <Text style={[styles.h, { color: colors.primary }]}>{formatPrice(total)}</Text>
          </View>
        </Card>

        <Button title={t('checkout.send')} icon="whatsapp" variant="whatsapp" disabled={!valid} onPress={submit} />
        {!valid && <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 13 }}>{t('checkout.fill')}</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 16, fontWeight: '800', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  doneTitle: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
});
