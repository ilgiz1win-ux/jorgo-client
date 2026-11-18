import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field } from '../../components/ui';
import { isRemote } from '../../config/backend';
import { colors } from '../../config/theme';
import { addAdmin, AdminUser, listAdmins, myUserId, removeAdmin } from '../../lib/notifications';

// Админдерди башкаруу: кошуу (email же катталган телефон) жана алып салуу
export default function Admins() {
  const [list, setList] = useState<AdminUser[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [login, setLogin] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setList(await listAdmins());
      setMe(await myUserId());
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setMsg({ ok: false, text: m.includes('admin_list') ? 'SQL иштетиле элек (010_notifications.sql).' : m });
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const ok = await addAdmin(login);
      setMsg(ok ? { ok: true, text: 'Админ кошулду' } : { ok: false, text: 'Мындай колдонуучу табылган жок. Ал адам алгач колдонмодо катталышы керек (телефон менен) же Supabase\'те email менен түзүлүшү керек.' });
      if (ok) {
        setLogin('');
        load();
      }
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Ката кетти' });
    }
    setBusy(false);
  };

  const remove = async (id: string) => {
    setMsg(null);
    try {
      await removeAdmin(id);
      setConfirm(null);
      load();
    } catch (e) {
      const m = e instanceof Error ? e.message : '';
      setMsg({ ok: false, text: m.includes('last admin') ? 'Акыркы админди алып салууга болбойт' : m || 'Ката кетти' });
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.hint}>
        Админдер панелге кире алышат жана жаңы өтүнмөлөр, төлөм күнү жана кечиккен төлөмдөр тууралуу билдирме алышат. Админ алмашса, эскисин алып салып, жаңысын кошуңуз.
      </Text>

      {list.map((a) => (
        <Card key={a.userId} style={styles.row}>
          <MaterialCommunityIcons name="shield-account" size={24} color={colors.primary} />
          <Text style={styles.login} numberOfLines={1}>
            {a.login}
            {a.userId === me ? '  (сиз)' : ''}
          </Text>
          {a.userId !== me && isRemote &&
            (confirm === a.userId ? (
              <Pressable onPress={() => remove(a.userId)} hitSlop={8}>
                <Text style={{ color: colors.danger, fontWeight: '800' }}>Алып салуу?</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setConfirm(a.userId)} hitSlop={8} accessibilityLabel="Алып салуу">
                <MaterialCommunityIcons name="account-remove-outline" size={24} color={colors.danger} />
              </Pressable>
            ))}
        </Card>
      ))}

      {isRemote ? (
        <Card style={{ gap: 12 }}>
          <Text style={styles.h}>Жаңы админ кошуу</Text>
          <Field label="Телефон же email" value={login} onChangeText={setLogin} placeholder="+996 700 123 456" autoCapitalize="none" />
          <Button title="Кошуу" icon="account-plus" disabled={busy || login.trim().length < 5} onPress={add} />
        </Card>
      ) : (
        <Text style={styles.hint}>Демо режимде админдерди башкарууга болбойт.</Text>
      )}
      {msg && <Text style={{ color: msg.ok ? colors.success : colors.danger }}>{msg.text}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  login: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  h: { fontSize: 16, fontWeight: '800', color: colors.text },
});
