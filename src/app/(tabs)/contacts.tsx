import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '../../components/ui';
import { isRemote } from '../../config/backend';
import { SHOP } from '../../config/shop';
import { colors } from '../../config/theme';
import type { IconName } from '../../data/products';
import { callShop, formatPrice, mapUrl, openWhatsApp } from '../../lib/format';

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
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 96 }}>
      <Card style={{ gap: 4, padding: 4 }}>
        <Row icon="phone" title="Телефон" value={SHOP.phone} onPress={callShop} />
        <Row icon="whatsapp" title="WhatsApp" value={`+${SHOP.whatsapp}`} color={colors.whatsapp} onPress={() => openWhatsApp('Саламатсызбы!')} />
        <Row icon="instagram" title="Instagram" value={`@${SHOP.instagram}`} color="#DB2777" onPress={() => Linking.openURL(`https://instagram.com/${SHOP.instagram}`)} />
        {SHOP.branches.map((b, i) => (
          <Row
            key={b}
            icon="map-marker"
            title={`Филиал ${i + 1} · ${SHOP.city}`}
            value={b}
            color={colors.danger}
            onPress={() => Linking.openURL(mapUrl(b))}
          />
        ))}
        <Row icon="clock-outline" title="Иш убактысы" value={SHOP.hours} color={colors.accent} />
      </Card>

      <Card style={{ gap: 8 }}>
        <Text style={styles.h}>Жеткирүү жана кепилдик</Text>
        <Text style={styles.p}>🚚 Шаар ичинде жеткирүү — {formatPrice(SHOP.deliveryFee)}, {formatPrice(SHOP.freeDeliveryFrom)} ашык буйрутмага акысыз.</Text>
        <Text style={styles.p}>🛡 Электровелосипеддерге жана батареяларга кепилдик берилет.</Text>
        <Text style={styles.p}>💳 Накталай, карта менен же бөлүп төлөө мүмкүн.</Text>
      </Card>

      {/* Сервер туташканда гана көрсөтүлөт; демо режимде /admin дареги аркылуу кирсе болот */}
      {isRemote && (
        <Link href="/admin" style={styles.admin}>
          Дүкөн ээси үчүн: админ панель
        </Link>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  h: { fontSize: 16, fontWeight: '800', color: colors.text },
  p: { fontSize: 14, lineHeight: 20, color: colors.text },
  admin: { color: colors.muted, fontSize: 13, textAlign: 'center', paddingVertical: 12, textDecorationLine: 'underline' },
});
