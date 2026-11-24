import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius } from '../../config/theme';
import { useT } from '../../i18n';
import { rateRepair, Repair } from '../../lib/repairs';

export function Stars({ n, size = 18 }: { n: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((k) => (
        <MaterialCommunityIcons key={k} name={n >= k ? 'star' : 'star-outline'} size={size} color="#F59E0B" />
      ))}
    </View>
  );
}

// Кардар бүткөн выездди / оңдоону баалайт: жылдыздар жана кыска пикир
export function RateRepair({ r, masterName, onDone }: { r: Repair; masterName?: string; onDone: (stars: number, note: string) => void }) {
  const { t } = useT();
  const [stars, setStars] = useState(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);

  if (r.ratedAt && r.rating) {
    return (
      <View style={styles.done}>
        <Stars n={r.rating} />
        <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{r.ratingNote || t('rate.thanks')}</Text>
      </View>
    );
  }
  const send = async () => {
    setBusy(true);
    setErr(false);
    const ok = await rateRepair(r.id, stars, note).catch(() => false);
    setBusy(false);
    if (ok) onDone(stars, note.trim());
    else setErr(true);
  };
  return (
    <View style={styles.box}>
      <Text style={styles.q}>{(r.outcall ? t('rate.qOutcall', { m: masterName ?? t('rate.master') }) : t('rate.qRepair', { m: masterName ?? t('rate.master') })).replace(/\s+/g, ' ')}</Text>
      <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
        {[1, 2, 3, 4, 5].map((k) => (
          <Pressable key={k} onPress={() => setStars(k)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${k}`}>
            <MaterialCommunityIcons name={stars >= k ? 'star' : 'star-outline'} size={36} color="#F59E0B" />
          </Pressable>
        ))}
      </View>
      {stars > 0 && (
        <>
          <Text style={styles.hint}>{t(`rate.s${stars}` as 'rate.s1')}</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={stars <= 3 ? t('rate.notePoor') : t('rate.note')}
            placeholderTextColor={colors.muted}
            multiline
            maxLength={500}
            style={styles.input}
          />
          <Pressable disabled={busy} onPress={send} style={styles.send}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '900' }}>{t('rate.send')}</Text>}
          </Pressable>
        </>
      )}
      {err && <Text style={{ color: colors.danger, fontWeight: '700' }}>{t('rate.error')}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 8, backgroundColor: '#FFFBEB', borderRadius: radius.md, borderWidth: 1, borderColor: '#FCD34D', padding: 12 },
  q: { fontWeight: '900', color: colors.text, fontSize: 15, textAlign: 'center' },
  hint: { textAlign: 'center', color: '#B45309', fontWeight: '800' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 10, minHeight: 56, color: colors.text, backgroundColor: colors.card, fontSize: 14 },
  send: { backgroundColor: '#F59E0B', borderRadius: 999, paddingVertical: 11, alignItems: 'center' },
  done: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFBEB', borderRadius: radius.md, padding: 10 },
});
