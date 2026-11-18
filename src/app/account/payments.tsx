import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MenuGroup, MenuRow } from '../../components/account/MenuGroup';
import { colors } from '../../config/theme';
import { useT } from '../../i18n';

// Төлөм ыкмалары. Картаны байлоо үчүн банк менен келишим керек — азырынча маалымат гана.
export default function Payments() {
  const { t } = useT();
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
      <MenuGroup>
        <MenuRow first icon="cash" label="Накталай / Наличные" />
        <MenuRow icon="bank-transfer" label="MBANK" />
        <MenuRow icon="cellphone-nfc" label="O!Деньги" />
      </MenuGroup>
      <View style={styles.note}>
        <MaterialCommunityIcons name="information-outline" size={20} color={colors.primary} />
        <Text style={styles.text}>{t('acc.paymentsText')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', gap: 10, backgroundColor: colors.primarySoft, borderRadius: 20, padding: 16 },
  text: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
});
