import { Linking } from 'react-native';
import { SHOP } from '../config/shop';

export const formatPrice = (n: number) =>
  `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ${SHOP.currency}`;

export const openWhatsApp = (text: string) =>
  Linking.openURL(`https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(text)}`);

export const callShop = () => Linking.openURL(`tel:${SHOP.phone.replace(/\s/g, '')}`);
