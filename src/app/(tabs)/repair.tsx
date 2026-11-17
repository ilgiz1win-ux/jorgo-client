import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, SectionTitle } from '../../components/ui';
import { colors } from '../../config/theme';
import { SERVICES } from '../../data/services';
import { callShop, openWhatsApp } from '../../lib/format';

export default function Repair() {
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+996 ');
  const [bike, setBike] = useState('');
  const [problem, setProblem] = useState('');
  const [sent, setSent] = useState(false);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const valid = name.trim().length > 1 && phone.replace(/\D/g, '').length >= 9 && (selected.length > 0 || problem.trim().length > 3);

  const submit = () => {
    const services = SERVICES.filter((s) => selected.includes(s.id)).map((s) => `• ${s.title}`);
    const msg = [
      '🔧 Оңдоого жазылуу',
      '',
      `Аты: ${name.trim()}`,
      `Тел: ${phone.trim()}`,
      bike.trim() ? `Велосипед: ${bike.trim()}` : null,
      services.length ? `Кызматтар:\n${services.join('\n')}` : null,
      problem.trim() ? `Көйгөй: ${problem.trim()}` : null,
    ]
      .filter(Boolean)
      .join('\n');
    openWhatsApp(msg).catch(() => {});
    setSent(true);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Card style={styles.banner}>
          <MaterialCommunityIcons name="tools" size={32} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Электровелосипед оңдоо</Text>
            <Text style={{ color: colors.primarySoft }}>Кызматтарды тандап, онлайн жазылыңыз</Text>
          </View>
        </Card>

        <SectionTitle>Кызматтар жана баалар</SectionTitle>
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

        <SectionTitle>Жазылуу</SectionTitle>
        {sent ? (
          <Card style={{ alignItems: 'center', gap: 10 }}>
            <MaterialCommunityIcons name="check-circle" size={48} color={colors.success} />
            <Text style={{ fontSize: 16, fontWeight: '700', textAlign: 'center' }}>Өтүнмө жөнөтүлдү! Сиз менен жакында байланышабыз.</Text>
            <Button
              title="Жаңы өтүнмө"
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
            <Field label="Атыңыз *" value={name} onChangeText={setName} placeholder="Атыңыз" />
            <Field label="Телефон *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Field label="Велосипед модели" value={bike} onChangeText={setBike} placeholder="Мисалы: Fat-bike 750W" />
            <Field label="Көйгөйдү сүрөттөңүз" value={problem} onChangeText={setProblem} multiline placeholder="Эмне болду?" />
            <Button title="WhatsApp аркылуу жазылуу" icon="whatsapp" variant="whatsapp" disabled={!valid} onPress={submit} />
            <Button title="Чалуу" icon="phone" variant="outline" onPress={callShop} />
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
  serviceTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
});
