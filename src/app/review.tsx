import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RequireAccount } from '../components/account/RequireAccount';
import { PopIn } from '../components/anim';
import { Button, Chip, Field } from '../components/ui';
import { colors } from '../config/theme';
import { useAccount } from '../context/AccountContext';
import { TKey, useT } from '../i18n';
import { ReviewAbout, sendReview } from '../lib/reviewSubmissions';

const ABOUTS: ReviewAbout[] = ['shop', 'repair', 'rental', 'product'];

// Кардар пикир калтырат: жылдыз + текст. Админ ырастаса башкы бетке чыгат.
function ReviewForm() {
  const { t } = useT();
  const { profile } = useAccount();
  const params = useLocalSearchParams<{ about?: string; ref?: string }>();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [name, setName] = useState(profile?.fullName?.split(' ')[0] ?? '');
  const [about, setAbout] = useState<ReviewAbout>((ABOUTS as string[]).includes(params.about ?? '') ? (params.about as ReviewAbout) : 'shop');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await sendReview({ name, rating, text, about, refTitle: params.ref });
      setSent(true);
    } catch {
      setError(t('chat.error'));
    }
    setBusy(false);
  };

  if (sent)
    return (
      <View style={styles.done}>
        <PopIn>
          <MaterialCommunityIcons name="heart" size={64} color={colors.danger} />
        </PopIn>
        <Text style={styles.doneText}>{t('rv.thanks')}</Text>
        <Button title={t('nav.back')} variant="outline" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </View>
    );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.h}>{t('rv.how')}</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${n}`}>
              <MaterialCommunityIcons name={n <= rating ? 'star' : 'star-outline'} size={44} color="#F59E0B" />
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ABOUTS.map((a) => (
            <Chip key={a} label={t(`rv.about.${a}` as TKey)} active={about === a} onPress={() => setAbout(a)} />
          ))}
        </View>
        {!!params.ref && <Text style={{ color: colors.muted }}>{params.ref}</Text>}
        <Field label={t('rv.text')} value={text} onChangeText={setText} multiline placeholder={t('rv.textPh')} maxLength={1000} />
        <Field label={t('rv.name')} value={name} onChangeText={setName} placeholder={t('repair.namePh')} />
        <Text style={{ color: colors.muted, fontSize: 13 }}>{t('rv.note')}</Text>
        {error && <Text style={{ color: colors.danger }}>{error}</Text>}
        <Button title={t('rv.send')} icon="send" disabled={busy || text.trim().length < 3 || !name.trim()} onPress={submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function ReviewScreen() {
  return (
    <RequireAccount next="/review">
      <ReviewForm />
    </RequireAccount>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 20, fontWeight: '900', color: colors.text, textAlign: 'center' },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  doneText: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
});
