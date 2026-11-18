import { useEffect, useState } from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import { docUrl } from '../../lib/account';

// Жабык бакеттеги документтин сүрөтү (убактылуу шилтеме аркылуу)
export function DocImage({ path, style }: { path?: string; style: StyleProp<ImageStyle> }) {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    docUrl(path).then((u) => alive && setUri(u));
    return () => {
      alive = false;
    };
  }, [path]);
  if (!uri) return null;
  return <Image source={{ uri }} style={style} resizeMode="cover" />;
}
