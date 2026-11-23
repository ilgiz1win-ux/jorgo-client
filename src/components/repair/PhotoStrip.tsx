import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

// Заказдын сүрөттөрү: кичине сүрөттөр; басса — чоң ачылат
export function PhotoStrip({ photos, size = 84, onRemove }: { photos: string[]; size?: number; onRemove?: (i: number) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!photos.length) return null;
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {photos.map((u, i) => (
          <Pressable key={u + i} onPress={() => setOpen(u)} style={[styles.thumb, { width: size, height: size }]} accessibilityRole="imagebutton">
            <Image source={{ uri: u }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            {onRemove && (
              <Pressable onPress={() => onRemove(i)} style={styles.remove} hitSlop={6} accessibilityLabel="remove">
                <MaterialCommunityIcons name="close" size={14} color="#fff" />
              </Pressable>
            )}
          </Pressable>
        ))}
      </ScrollView>
      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
        <Pressable style={styles.back} onPress={() => setOpen(null)}>
          {open && <Image source={{ uri: open }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />}
          <View style={{ flexDirection: 'row', gap: 24, marginTop: 12 }}>
            {open && !open.startsWith('data:') && (
              <Pressable onPress={() => Linking.openURL(open)} hitSlop={8}>
                <MaterialCommunityIcons name="open-in-new" size={28} color="#fff" />
              </Pressable>
            )}
            <Pressable onPress={() => setOpen(null)} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle" size={28} color="#fff" />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  thumb: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#E5E7EB' },
  remove: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  back: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center', padding: 16 },
});
