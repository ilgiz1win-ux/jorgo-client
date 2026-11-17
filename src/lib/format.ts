import { Linking, Platform } from 'react-native';
import { SHOP } from '../config/shop';

export const formatPrice = (n: number) =>
  `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ${SHOP.currency}`;

export const whatsAppUrl = (text: string) => `https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(text)}`;

export const openWhatsApp = async (text: string) => {
  const url = whatsAppUrl(text);
  // Вебде (Instagram'дын ичиндеги браузерди кошо) жаңы терезе бөгөттөлүшү мүмкүн,
  // ошондуктан ошол эле барактан WhatsApp'ка өтөбүз.
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.href = url;
    return;
  }
  await Linking.openURL(url);
};

export const callShop = () => Linking.openURL(`tel:${SHOP.phone.replace(/\s/g, '')}`);
