import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BroadcastList } from '../../components/BroadcastList';
import { Button, Card, Chip, Field } from '../../components/ui';
import { isRemote } from '../../config/backend';
import { colors, radius } from '../../config/theme';
import { useCatalog } from '../../context/CatalogContext';
import { useContent } from '../../context/ContentContext';
import { Broadcast, deleteBroadcast, fetchBroadcasts, sendBroadcast } from '../../lib/broadcasts';
import { formatPrice } from '../../lib/format';
import { pickAndUploadImage } from '../../lib/pickImage';
import { supabase } from '../../lib/supabase';

type Draft = { title: string; body: string; imageUrl?: string; link?: string };
const empty: Draft = { title: '', body: '' };

// Бардык кардарларга билдирме: акция, арзандатылган товар, жаңылык
export default function AdminBroadcast() {
  const { promos, products } = useCatalog();
  const { branches } = useContent();
  // Розыгрыш үлгүсү: убакыт, точка, белек → даяр текст
  const [gOpen, setGOpen] = useState(false);
  const [gTime, setGTime] = useState('19:00');
  const [gBranch, setGBranch] = useState(0);
  const [gPrize, setGPrize] = useState('шлем');
  const fillGiveaway = () => {
    const place = branches[gBranch]?.name ?? '';
    setD({
      title: `🎁 Розыгрыш! ${gPrize.trim()} бекер`,
      body: `Бүгүн саат ${gTime.trim()}дө ${place} дарегинде ${gPrize.trim()} бекер беребиз — ким биринчи келсе! Досторуңузга да айтыңыз. Кеч калбаңыз!`,
      imageUrl: d.imageUrl,
      link: '/contacts',
    });
    setGOpen(false);
  };
  const [d, setD] = useState<Draft>(empty);
  const [history, setHistory] = useState<Broadcast[]>([]);
  const [devices, setDevices] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setHistory(await fetchBroadcasts());
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setMsg({ ok: false, text: m.includes('broadcasts') ? 'SQL иштетиле элек (012_broadcasts_push.sql).' : m });
    }
    if (supabase) {
      const { count } = await supabase.from('push_tokens').select('token', { count: 'exact', head: true });
      setDevices(count ?? 0);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const sale = products.filter((p) => p.oldPrice && p.inStock).slice(0, 12);
  const activePromos = promos.filter((p) => p.active);

  const pick = async () => {
    setUploading(true);
    try {
      const url = await pickAndUploadImage([2, 1]);
      if (url) setD((x) => ({ ...x, imageUrl: url }));
    } catch (e) {
      setMsg({ ok: false, text: 'Сүрөт жүктөлгөн жок: ' + (e instanceof Error ? e.message : '') });
    }
    setUploading(false);
  };

  const send = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await sendBroadcast(d);
      setD(empty);
      setMsg({ ok: true, text: 'Жөнөтүлдү! Кардарлар 🔔 коңгуроодо көрүшөт' + (devices ? `, ${devices} телефонго push кетти.` : '.') });
      load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Ката кетти' });
    }
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>
          Билдирме бардык кардарларга барат: сайтта жана колдонмодо 🔔 коңгуроодо көрүнөт. Колдонмону (APK) орноткондордун телефонуна SMS сыяктуу push келет.
          {isRemote && devices !== null ? `\nPush алуучу телефондор: ${devices}` : ''}
        </Text>

        <View style={styles.giveaway}>
          <Pressable onPress={() => setGOpen(!gOpen)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialCommunityIcons name="gift-outline" size={22} color="#DB2777" />
            <Text style={{ flex: 1, fontWeight: '800', color: colors.text }}>🎁 Розыгрыш үлгүсү</Text>
            <MaterialCommunityIcons name={gOpen ? 'chevron-up' : 'chevron-down'} size={22} color={colors.muted} />
          </Pressable>
          {gOpen && (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field label="Саат" value={gTime} onChangeText={setGTime} placeholder="19:00" keyboardType="numbers-and-punctuation" />
                </View>
                <View style={{ flex: 1.6 }}>
                  <Field label="Белек" value={gPrize} onChangeText={setGPrize} placeholder="шлем" />
                </View>
              </View>
              <Text style={styles.label}>Кайсы точкада</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {branches.map((b, i) => (
                  <Chip key={b.name + i} label={`📍 ${b.name}`} active={gBranch === i} onPress={() => setGBranch(i)} />
                ))}
              </View>
              <Button title="Текстти толтуруу" icon="text-box-edit-outline" variant="outline" disabled={!gTime.trim() || !gPrize.trim()} onPress={fillGiveaway} />
            </View>
          )}
        </View>

        {activePromos.length > 0 && (
          <View style={{ gap: 6 }}>
            <Text style={styles.label}>Акциядан толтуруу</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {activePromos.map((p) => (
                <Chip key={p.id} label={p.title} onPress={() => setD({ title: `🔥 ${p.title}`, body: p.text, imageUrl: p.imageUrl, link: '/' })} />
              ))}
            </ScrollView>
          </View>
        )}
        {sale.length > 0 && (
          <View style={{ gap: 6 }}>
            <Text style={styles.label}>Арзандатылган товардан толтуруу</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {sale.map((p) => (
                <Chip
                  key={p.id}
                  label={p.name}
                  onPress={() =>
                    setD({
                      title: `💥 Арзандатуу: ${p.name}`,
                      body: `${formatPrice(p.price)} (мурда ${formatPrice(p.oldPrice!)}). Чектелген убакытка гана!`,
                      imageUrl: p.imageUrl,
                      link: `/product/${p.id}`,
                    })
                  }
                />
              ))}
            </ScrollView>
          </View>
        )}

        <Card style={{ gap: 12 }}>
          <Pressable onPress={pick} style={styles.photo} disabled={uploading}>
            {d.imageUrl ? (
              <Image source={{ uri: d.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <MaterialCommunityIcons name="image-plus" size={40} color={colors.primary} />
            )}
            <View style={styles.photoBtn}>
              {uploading ? <ActivityIndicator color="#fff" /> : <MaterialCommunityIcons name="camera-plus" size={16} color="#fff" />}
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{d.imageUrl ? 'Сүрөттү алмаштыруу' : 'Сүрөт (милдеттүү эмес)'}</Text>
            </View>
          </Pressable>
          <Field label="Аталышы *" value={d.title} onChangeText={(t) => setD({ ...d, title: t })} placeholder="Мисалы: 🔥 Дем алыш күндөрү −15%" maxLength={120} />
          <Field label="Тексти" value={d.body} onChangeText={(t) => setD({ ...d, body: t })} placeholder="Мисалы: Бардык батареяларга арзандатуу 24-ноябрга чейин" multiline maxLength={500} />
          {!!d.link && (
            <View style={styles.linkRow}>
              <MaterialCommunityIcons name="link-variant" size={16} color={colors.muted} />
              <Text style={{ flex: 1, color: colors.muted, fontSize: 13 }}>Басканда ачылат: {d.link}</Text>
              <Pressable onPress={() => setD({ ...d, link: undefined })} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={18} color={colors.muted} />
              </Pressable>
            </View>
          )}
          <Button title={busy ? 'Жөнөтүлүүдө…' : 'Бардыгына жөнөтүү'} icon="send" disabled={busy || d.title.trim().length < 2} onPress={send} />
          {msg && <Text style={{ color: msg.ok ? colors.success : colors.danger }}>{msg.text}</Text>}
        </Card>

        {history.length > 0 && <Text style={[styles.label, { marginTop: 8 }]}>Жөнөтүлгөндөр</Text>}
        {history.map((b) => (
          <View key={b.id} style={{ gap: 6 }}>
            <BroadcastList items={[b]} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              {confirm === b.id ? (
                <Pressable onPress={() => deleteBroadcast(b.id).then(load).then(() => setConfirm(null))} hitSlop={8}>
                  <Text style={{ color: colors.danger, fontWeight: '800' }}>Ооба, өчүр</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => setConfirm(b.id)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontWeight: '600' }}>Өчүрүү</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted },
  photo: { height: 150, borderRadius: radius.lg, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoBtn: { position: 'absolute', bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  giveaway: { gap: 10, backgroundColor: '#FDF2F8', borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: '#FBCFE8' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
