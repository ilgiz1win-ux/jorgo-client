import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { InstallRow } from '../../components/InstallApp';
import { Card } from '../../components/ui';
import { isRemote } from '../../config/backend';
import { SHOP } from '../../config/shop';
import { colors } from '../../config/theme';
import type { IconName } from '../../data/products';
import { callShop, formatPrice, mapUrl, openWhatsApp } from '../../lib/format';
import { TKey, useT } from '../../i18n';
import { LangSwitch } from '../../components/LangSwitch';

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
        {SHOP.branches.map((b, i) => (
          <Row
            key={b}
            icon="map-marker"
            title={t('contacts.branch', { n: i + 1, city: SHOP.city })}
            value={t(`shop.branch.${i}` as TKey)}
            color={colors.danger}
            onPress={() => Linking.openURL(mapUrl(b))}
          />
        ))}
        <Row icon="clock-outline" title={t('contacts.hours')} value={t('shop.hours')} color={colors.accent} />
      </Card>

      <Card style={{ gap: 8 }}>
        <Text style={styles.h}>{t('contacts.deliveryTitle')}</Text>
        <Text style={styles.p}>{t('contacts.delivery', { fee: formatPrice(SHOP.deliveryFee), free: formatPrice(SHOP.freeDeliveryFrom) })}</Text>
        <Text style={styles.p}>{t('contacts.warranty')}</Text>
        <Text style={styles.p}>{t('contacts.payment')}</Text>
      </Card>

      <InstallRow />

      {/* Сервер туташканда гана көрсөтүлөт; демо режимде /admin дареги аркылуу кирсе болот */}
      {isRemote && (
        <Link href="/admin" style={styles.admin}>
          {t('contacts.admin')}
        </Link>
      )}
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
