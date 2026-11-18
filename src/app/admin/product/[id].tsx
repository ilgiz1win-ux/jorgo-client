import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button, Card, Chip, Field } from '../../../components/ui';
import { colors, radius } from '../../../config/theme';
import { useCatalog } from '../../../context/CatalogContext';
import { BADGES, CATEGORIES, CategoryId, getCategory, Product, ProductBadge } from '../../../data/products';
import { newId } from '../../../lib/catalogApi';
import { pickAndUploadImage } from '../../../lib/pickImage';
import { formatPrice } from '../../../lib/format';

const toNumber = (s: string) => Number(s.replace(/[^\d]/g, '')) || 0;

export default function ProductEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getProduct, saveProduct, deleteProduct } = useCatalog();
  const existing = id === 'new' ? undefined : getProduct(id);

  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState<CategoryId>(existing?.category ?? 'ebike');
  const [price, setPrice] = useState(existing ? String(existing.price) : '');
  const [oldPrice, setOldPrice] = useState(existing?.oldPrice ? String(existing.oldPrice) : '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [specs, setSpecs] = useState((existing?.specs ?? []).map(([k, v]) => `${k}: ${v}`).join('\n'));
  const [inStock, setInStock] = useState(existing?.inStock ?? true);
  const [popular, setPopular] = useState(existing?.popular ?? false);
  const [imageUrl, setImageUrl] = useState(existing?.imageUrl);
  const [images, setImages] = useState<string[]>(existing?.images ?? []);
  const [badge, setBadge] = useState<ProductBadge | null>(existing?.badge ?? null);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceN = toNumber(price);
  const oldN = toNumber(oldPrice);
  const discount = oldN > priceN && priceN > 0 ? Math.round((1 - priceN / oldN) * 100) : 0;
  const valid = name.trim().length > 1 && priceN > 0;

  const pickImage = async () => {
    setError(null);
    setUploading(true);
    try {
      const url = await pickAndUploadImage([1, 1]);
      if (url) setImageUrl(url);
    } catch (e) {
      setError('Сүрөт жүктөлгөн жок: ' + (e instanceof Error ? e.message : ''));
    }
    setUploading(false);
  };

  const MAX_EXTRA = 5;
  const addExtraImage = async () => {
    setError(null);
    setUploadingExtra(true);
    try {
      const url = await pickAndUploadImage([1, 1]);
      if (url) setImages((cur) => [...cur, url].slice(0, MAX_EXTRA));
    } catch (e) {
      setError('Сүрөт жүктөлгөн жок: ' + (e instanceof Error ? e.message : ''));
    }
    setUploadingExtra(false);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const product: Product = {
      id: existing?.id ?? newId('p'),
      name: name.trim(),
      category,
      price: priceN,
      oldPrice: oldN > priceN ? oldN : undefined,
      icon: existing?.icon ?? getCategory(category).icon,
      imageUrl,
      images,
      badge,
      image: existing?.image,
      description: description.trim(),
      specs: specs
        .split('\n')
        .map((l) => l.split(':'))
        .filter((parts) => parts.length >= 2 && parts[0].trim())
        .map(([k, ...v]) => [k.trim(), v.join(':').trim()] as [string, string]),
      inStock,
      popular,
    };
    try {
      await saveProduct(product);
      router.back();
    } catch (e) {
      setError('Сакталган жок: ' + (e instanceof Error ? e.message : ''));
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    try {
      await deleteProduct(existing.id);
      router.back();
    } catch (e) {
      setError('Өчүрүлгөн жок: ' + (e instanceof Error ? e.message : ''));
    }
  };

  if (id !== 'new' && !existing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Товар табылган жок</Text>
      </View>
    );
  }

  const cat = getCategory(category);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: existing ? 'Товарды өзгөртүү' : 'Жаңы товар' }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={pickImage} style={[styles.photo, { backgroundColor: cat.color + '18' }]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <MaterialCommunityIcons name={existing?.icon ?? cat.icon} size={72} color={cat.color} />
          )}
          <View style={styles.photoBtn}>
            {uploading ? <ActivityIndicator color="#fff" /> : <MaterialCommunityIcons name="camera-plus" size={18} color="#fff" />}
            <Text style={{ color: '#fff', fontWeight: '700' }}>{uploading ? 'Жүктөлүүдө…' : imageUrl ? 'Сүрөттү алмаштыруу' : 'Сүрөт кошуу'}</Text>
          </View>
        </Pressable>
        {imageUrl && (
          <Pressable onPress={() => setImageUrl(undefined)} style={{ alignSelf: 'center' }}>
            <Text style={{ color: colors.danger, fontWeight: '600' }}>Сүрөттү алып салуу</Text>
          </Pressable>
        )}

        <Card style={{ gap: 10 }}>
          <Text style={styles.h}>Кошумча сүрөттөр ({images.length}/{MAX_EXTRA})</Text>
          <Text style={styles.hint}>Кардар товар барагында сүрөттөрдү солго-оңго сүрүп көрөт.</Text>
          <View style={styles.thumbs}>
            {images.map((uri) => (
              <View key={uri}>
                <Image source={{ uri }} style={styles.thumb} />
                <Pressable
                  style={styles.thumbX}
                  hitSlop={6}
                  onPress={() => setImages((cur) => cur.filter((u) => u !== uri))}
                  accessibilityLabel="Сүрөттү алып салуу"
                >
                  <MaterialCommunityIcons name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            ))}
            {images.length < MAX_EXTRA && (
              <Pressable style={[styles.thumb, styles.thumbAdd]} onPress={addExtraImage} disabled={uploadingExtra} accessibilityLabel="Сүрөт кошуу">
                {uploadingExtra ? <ActivityIndicator color={colors.primary} /> : <MaterialCommunityIcons name="image-plus" size={26} color={colors.primary} />}
              </Pressable>
            )}
          </View>
        </Card>

        <Card style={{ gap: 14 }}>
          <Field label="Аталышы *" value={name} onChangeText={setName} placeholder="Мисалы: Fat-bike 750W" />
          <View style={{ gap: 6 }}>
            <Text style={styles.label}>Категория</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => (
                <Chip key={c.id} label={c.title} active={category === c.id} onPress={() => setCategory(c.id)} />
              ))}
            </View>
          </View>
        </Card>

        <Card style={{ gap: 14 }}>
          <Text style={styles.h}>Баа жана акция</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label="Баасы, сом *" value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="65000" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Эски баасы (акция)" value={oldPrice} onChangeText={setOldPrice} keyboardType="number-pad" placeholder="72000" />
            </View>
          </View>
          {discount > 0 ? (
            <View style={styles.saleNote}>
              <MaterialCommunityIcons name="sale" size={18} color={colors.danger} />
              <Text style={{ color: colors.danger, fontWeight: '700' }}>
                −{discount}% арзандатуу: {formatPrice(oldN)} → {formatPrice(priceN)}
              </Text>
            </View>
          ) : (
            <Text style={styles.hint}>Акция коюу үчүн «Эски баасы» талаасына мурдагы, кымбатыраак бааны жазыңыз.</Text>
          )}
        </Card>

        <Card style={{ gap: 14 }}>
          <Field label="Сүрөттөмө" value={description} onChangeText={setDescription} multiline placeholder="Товар жөнүндө кыскача" />
          <Field label="Мүнөздөмөлөр (ар бири жаңы саптан)" value={specs} onChangeText={setSpecs} multiline placeholder={'Мотор: 750 Вт\nБатарея: 48V 15Ah'} />
        </Card>

        <Card style={{ gap: 4, paddingVertical: 8 }}>
          <ToggleRow label="Сатыкта бар" value={inStock} onChange={setInStock} />
          <ToggleRow label="Популярдуу (башкы бетте көрсөтүү)" value={popular} onChange={setPopular} />
          <View style={{ gap: 6, paddingVertical: 8 }}>
            <Text style={styles.label}>Белги (карточканын бурчунда)</Text>
            <View style={styles.chips}>
              <Chip label="Жок" active={!badge} onPress={() => setBadge(null)} />
              {(Object.keys(BADGES) as ProductBadge[]).map((b) => (
                <Chip key={b} label={BADGES[b].label} active={badge === b} onPress={() => setBadge(b)} />
              ))}
            </View>
          </View>
        </Card>

        {error && <Text style={{ color: colors.danger }}>{error}</Text>}
        <Button title={saving ? 'Сакталууда…' : 'Сактоо'} icon="content-save" onPress={save} disabled={!valid || saving || uploading || uploadingExtra} />

        {existing &&
          (confirmDelete ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title="Жок" variant="outline" style={{ flex: 1 }} onPress={() => setConfirmDelete(false)} />
              <Button title="Ооба, өчүрүү" icon="trash-can" style={{ flex: 1, backgroundColor: colors.danger }} onPress={remove} />
            </View>
          ) : (
            <Pressable onPress={() => setConfirmDelete(true)} style={styles.delete}>
              <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.danger} />
              <Text style={{ color: colors.danger, fontWeight: '700' }}>Товарды өчүрүү</Text>
            </Pressable>
          ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.border }} />
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { height: 220, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 72, height: 72, borderRadius: radius.md },
  thumbAdd: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  thumbX: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(17,24,39,0.75)', alignItems: 'center', justifyContent: 'center' },
  photoBtn: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15,23,42,0.75)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  h: { fontSize: 16, fontWeight: '800', color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  saleNote: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2', padding: 10, borderRadius: radius.sm },
  hint: { color: colors.muted, fontSize: 13 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  delete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
});
