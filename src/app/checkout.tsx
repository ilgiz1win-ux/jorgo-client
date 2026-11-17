import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Field } from '../components/ui';
import { SHOP } from '../config/shop';
import { colors } from '../config/theme';
import { useCart } from '../context/CartContext';
import { formatPrice, openWhatsApp } from '../lib/format';

type Delivery = 'pickup' | 'courier';
type Payment = 'cash' | 'transfer' | 'installment';

const PAYMENT_LABEL: Record<Payment, string> = {
  cash: 'Накталай',
  transfer: 'Карта / которуу',
  installment: 'Бөлүп төлөө',
};

export default function Checkout() {
  const { lines, subtotal, clear, addOrder } = useCart();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+996 ');
  const [delivery, setDelivery] = useState<Delivery>('pickup');
  const [address, setAddress] = useState('');
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
        <MaterialCommunityIcons name="check-decagram" size={80} color={colors.success} />
        <Text style={styles.doneTitle}>Рахмат! Буйрутма №{done} кабыл алынды</Text>
        <Text style={{ color: colors.muted, textAlign: 'center' }}>
          Менеджерибиз жакын арада {phone} номерине чалып, буйрутманы ырастайт.
        </Text>
        <Button title="Башкы бетке" icon="home" onPress={() => router.replace('/')} />
      </View>
    );
  }

  if (!lines.length) {
    return (
      <View style={styles.done}>
        <Text style={{ color: colors.muted }}>Себет бош</Text>
        <Button title="Каталогго өтүү" onPress={() => router.replace('/catalog')} />
      </View>
    );
  }

  const submit = () => {
    const id = String(Date.now()).slice(-6);
    const itemsText = lines.map((l, i) => `${i + 1}. ${l.product.name} × ${l.qty} = ${formatPrice(l.product.price * l.qty)}`).join('\n');
    const msg = [
      `🛒 Жаңы буйрутма №${id}`,
      '',
      itemsText,
      '',
      deliveryFee ? `Жеткирүү: ${formatPrice(deliveryFee)}` : null,
      `Жалпы: ${formatPrice(total)}`,
      '',
      `Аты: ${name.trim()}`,
      `Тел: ${phone.trim()}`,
      `Алуу: ${delivery === 'pickup' ? 'Дүкөндөн өзү алып кетет' : `Жеткирүү — ${address.trim()}`}`,
      `Төлөм: ${PAYMENT_LABEL[payment]}`,
      comment.trim() ? `Комментарий: ${comment.trim()}` : null,
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
    openWhatsApp(msg).catch(() => {});
    clear();
    setDone(id);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 14 }}>
          <Text style={styles.h}>Байланыш маалыматы</Text>
          <Field label="Атыңыз *" value={name} onChangeText={setName} placeholder="Мисалы: Азамат" />
          <Field label="Телефон *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+996 700 123 456" />
        </Card>

        <Card style={{ gap: 12 }}>
          <Text style={styles.h}>Алуу ыкмасы</Text>
          <View style={styles.chips}>
            <Chip label="Дүкөндөн алуу" active={delivery === 'pickup'} onPress={() => setDelivery('pickup')} />
            <Chip label="Жеткирүү" active={delivery === 'courier'} onPress={() => setDelivery('courier')} />
          </View>
          {delivery === 'pickup' ? (
            <Text style={{ color: colors.muted }}>📍 {SHOP.address}</Text>
          ) : (
            <Field label="Дарек *" value={address} onChangeText={setAddress} placeholder="Көчө, үй, батир" />
          )}
        </Card>

        <Card style={{ gap: 12 }}>
          <Text style={styles.h}>Төлөм</Text>
          <View style={styles.chips}>
            {(Object.keys(PAYMENT_LABEL) as Payment[]).map((p) => (
              <Chip key={p} label={PAYMENT_LABEL[p]} active={payment === p} onPress={() => setPayment(p)} />
            ))}
          </View>
          <Field label="Комментарий" value={comment} onChangeText={setComment} multiline placeholder="Кошумча каалоолор" />
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
            <Text style={{ color: colors.muted }}>Жеткирүү</Text>
            <Text style={{ fontWeight: '600' }}>{deliveryFee ? formatPrice(deliveryFee) : 'Акысыз'}</Text>
          </View>
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }]}>
            <Text style={styles.h}>Жалпы</Text>
            <Text style={[styles.h, { color: colors.primary }]}>{formatPrice(total)}</Text>
          </View>
        </Card>

        <Button title="Буйрутманы WhatsApp'ка жөнөтүү" icon="whatsapp" variant="whatsapp" disabled={!valid} onPress={submit} />
        {!valid && <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 13 }}>* белгиленген талааларды толтуруңуз</Text>}
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
