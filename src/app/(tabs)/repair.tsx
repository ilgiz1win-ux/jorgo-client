import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PopIn } from '../../components/anim';
import { BeforeAfter } from '../../components/HomeSections';
import { MastersList } from '../../components/MastersList';
import { Button, Card, Field, SectionTitle } from '../../components/ui';
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
  const [outcall, setOutcall] = useState(false);
  // Выезд: тандалган мастер чыкса, же мастер тандалбаса — кимдир бирөө чыкса
  const outcallAvailable = master ? master.outcall : masters.some((m) => m.active && m.outcall);
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
      t('msg.repair'),
      '',
      t('msg.name', { v: name.trim() }),
      t('msg.phone', { v: phone.trim() }),
      bike.trim() ? t('msg.bike', { v: bike.trim() }) : null,
      master ? t('msg.master', { v: master.name }) : null,
      outcall && outcallAvailable ? t('msg.outcall') : null,
      services.length ? `${t('msg.services')}\n${services.join('\n')}` : null,
      problem.trim() ? t('msg.problem', { v: problem.trim() }) : null,
    ]
      .filter(Boolean)
      .join('\n');
    openWhatsApp(msg).catch(() => {});
    track('repair');
    setSent(true);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 96 }} keyboardShouldPersistTaps="handled">
        <Card style={styles.banner}>
          <MaterialCommunityIcons name="tools" size={32} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{t('repair.title')}</Text>
            <Text style={{ color: colors.primarySoft }}>{t('repair.subtitle')}</Text>
          </View>
        </Card>

        {masters.some((m) => m.active) && (
          <>
            <SectionTitle>{t('masters.title')}</SectionTitle>
            <Text style={{ color: colors.muted, fontSize: 13, marginTop: -4 }}>{t('masters.choose')}</Text>
            <MastersList masters={masters} selectedId={masterId} onSelect={setMasterId} />
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
            <Field label={t('repair.problem')} value={problem} onChangeText={setProblem} multiline placeholder={t('repair.problemPh')} />
            <Button title={t('repair.send')} icon="whatsapp" variant="whatsapp" disabled={!valid} onPress={submit} />
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
  serviceTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
});
