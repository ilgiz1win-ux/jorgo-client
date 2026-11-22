import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { InstallRow } from '../../components/InstallApp';
import { Card } from '../../components/ui';
import { SHOP } from '../../config/shop';
import { colors } from '../../config/theme';
import type { IconName } from '../../data/products';
import { callShop, formatPrice, mapUrl, openWhatsApp } from '../../lib/format';
import { TKey, useT } from '../../i18n';
import { LangSwitch } from '../../components/LangSwitch';
import { useContent } from '../../context/ContentContext';
import { branchLabel } from '../../lib/branches';

function Row({ icon, title, value, onPress, color = colors.primary }: { icon: IconName; title: string; value: string; onPress?: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.row}>
      <View style={[styles.icon, { backgroundColor: color + '1A' }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.muted, fontSize: 13 }}>{title}</Text>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{value}</Text>
      </View>
      {onPress && <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />}
    </Pressable>
  );
}

export default function Contacts() {
  const { t } = useT();
  const { branches } = useContent();
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 96 }}>
      <View style={styles.langRow}>
        <Text style={styles.langLabel}>{t('lang.label')}</Text>
        <LangSwitch />
      </View>
      <Card style={{ gap: 4, padding: 4 }}>
        <Row icon="phone" title={t('contacts.phone')} value={SHOP.phone} onPress={callShop} />
        <Row icon="whatsapp" title="WhatsApp" value={`+${SHOP.whatsapp}`} color={colors.whatsapp} onPress={() => openWhatsApp(t('common.hello'))} />
        <Row icon="instagram" title="Instagram" value={`@${SHOP.instagram}`} color="#DB2777" onPress={() => Linking.openURL(`https://instagram.com/${SHOP.instagram}`)} />
        {branches.map((b, i) => (
          <View key={b.name + i}>
            <Row
              icon="map-marker"
              title={t('contacts.branch', { n: i + 1, city: SHOP.city })}
              value={branchLabel(b, t)}
              color={colors.danger}
              onPress={() => Linking.openURL(mapUrl(b.name))}
            />
            {b.whatsapp !== SHOP.whatsapp && (
              <Row icon="whatsapp" title={`WhatsApp · ${branchLabel(b, t)}`} value={`+${b.whatsapp}`} color={colors.whatsapp} onPress={() => openWhatsApp(t('common.hello'), b.whatsapp)} />
            )}
          </View>
        ))}
        <Row icon="clock-outline" title={t('contacts.hours')} value={t('shop.hours')} color={colors.accent} />
      </Card>

      <Card style={{ gap: 8 }}>
        <Text style={styles.h}>{t('contacts.deliveryTitle')}</Text>
        <Text style={styles.p}>{t('contacts.delivery')}</Text>
        <Text style={styles.p}>{t('contacts.warranty')}</Text>
        <Text style={styles.p}>{t('contacts.payment')}</Text>
      </Card>

      <InstallRow />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  langRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.border },
  langLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  h: { fontSize: 16, fontWeight: '800', color: colors.text },
  p: { fontSize: 14, lineHeight: 20, color: colors.text },
  admin: { color: colors.muted, fontSize: 13, textAlign: 'center', paddingVertical: 12, textDecorationLine: 'underline' },
});
