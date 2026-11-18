import { Linking, Platform } from 'react-native';
import { SHOP } from '../config/shop';

export const formatPrice = (n: number) =>
  `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ${SHOP.currency}`;

export const whatsAppUrl = (text: string, phone: string = SHOP.whatsapp) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

export const openWhatsApp = async (text: string, phone?: string) => {
  const url = whatsAppUrl(text, phone);
  // Вебде (Instagram'дын ичиндеги браузерди кошо) жаңы терезе бөгөттөлүшү мүмкүн,
  // ошондуктан ошол эле барактан WhatsApp'ка өтөбүз.
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.href = url;
    return;
  }
  await Linking.openURL(url);
};

export const callShop = () => Linking.openURL(`tel:${SHOP.phone.replace(/\s/g, '')}`);

export const mapUrl = (branch: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${SHOP.city}, ${branch}`)}`;
