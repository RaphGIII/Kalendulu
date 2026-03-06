import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from 'react-native';
import { Category } from './types';

const CARD = '#0F2454';
const TEXT = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.72)';
const BORDER = 'rgba(255,255,255,0.10)';

const PRESET_COLORS = [
  '#D4AF37', // gold
  '#C0C0C0', // silver
  '#7C5CFF', // violet
  '#00C2C7', // cyan
  '#FF4FD8', // pink
  '#3AA0FF', // blue
  '#2ED3A7', // emerald
  '#FF7C7C', // coral
];

export default function CategoryManagerModal({
  visible,
  onClose,
  categories,
  onAdd,
  onRename,
  onRecolor,
  onDelete,
}: {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  onAdd: (name: string, color: string) => void;
  onRename: (id: string, name: string) => void;
  onRecolor: (id: string, color: string) => void;
  onDelete: (id: string) => void;
}) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const canAdd = useMemo(() => newName.trim().length >= 2, [newName]);

  return (
    <Modal transparent visible={visible} animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>Kategorien bearbeiten</Text>
            <Pressable onPress={onClose} style={styles.doneBtn}>
              <Text style={styles.doneText}>Fertig</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Neue Kategorie</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Name…"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={styles.input}
            />

            <View style={styles.colorRow}>
              {PRESET_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setNewColor(c)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    newColor === c && styles.colorDotActive,
                  ]}
                />
              ))}
            </View>

            <Pressable
              onPress={() => {
                if (!canAdd) return;
                onAdd(newName.trim(), newColor);
                setNewName('');
                setNewColor(PRESET_COLORS[0]);
              }}
              style={[styles.addBtn, !canAdd && { opacity: 0.35 }]}
            >
              <Text style={styles.addBtnText}>Hinzufügen</Text>
            </Pressable>
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>Bestehende</Text>
          <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: 10, paddingVertical: 10 }}>
            {categories.map((cat) => (
              <CategoryRow
                key={cat.id}
                cat={cat}
                onRename={onRename}
                onRecolor={onRecolor}
                onDelete={onDelete}
              />
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CategoryRow({
  cat,
  onRename,
  onRecolor,
  onDelete,
}: {
  cat: Category;
  onRename: (id: string, name: string) => void;
  onRecolor: (id: string, color: string) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(cat.name);

  return (
    <View style={styles.row}>
      <View style={[styles.swatch, { backgroundColor: cat.color }]} />

      <TextInput
        value={name}
        onChangeText={setName}
        onBlur={() => {
          const trimmed = name.trim();
          if (trimmed && trimmed !== cat.name) onRename(cat.id, trimmed);
        }}
        style={styles.rowInput}
        placeholderTextColor="rgba(255,255,255,0.45)"
      />

      <View style={styles.rowColors}>
        {PRESET_COLORS.slice(0, 6).map((c) => (
          <Pressable key={c} onPress={() => onRecolor(cat.id, c)} style={[styles.miniDot, { backgroundColor: c }]} />
        ))}
      </View>

      <Pressable onPress={() => onDelete(cat.id)} style={styles.delBtn}>
        <Text style={styles.delText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: CARD, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: BORDER },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: TEXT, fontWeight: '900', fontSize: 16 },
  doneBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: BORDER },
  doneText: { color: TEXT, fontWeight: '900' },

  section: { marginTop: 12, padding: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: BORDER },
  label: { color: MUTED, fontWeight: '900', letterSpacing: 0.9, fontSize: 12 },

  input: { marginTop: 10, borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 12, fontWeight: '900', color: TEXT, backgroundColor: 'rgba(255,255,255,0.06)' },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  colorDot: { width: 22, height: 22, borderRadius: 99, borderWidth: 2, borderColor: 'rgba(255,255,255,0.18)' },
  colorDotActive: { borderColor: 'rgba(255,255,255,0.9)' },

  addBtn: { marginTop: 14, borderRadius: 14, paddingVertical: 12, alignItems: 'center', backgroundColor: 'rgba(212,175,55,0.85)' },
  addBtnText: { color: '#0B1636', fontWeight: '900' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: 'rgba(255,255,255,0.04)' },
  swatch: { width: 12, height: 30, borderRadius: 6 },
  rowInput: { flex: 1, fontWeight: '900', color: TEXT, paddingVertical: 6 },

  rowColors: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  miniDot: { width: 16, height: 16, borderRadius: 99 },

  delBtn: { width: 30, height: 30, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: BORDER },
  delText: { color: MUTED, fontWeight: '900' },
});