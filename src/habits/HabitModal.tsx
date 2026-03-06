import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const CARD = '#0F2454';
const TEXT = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.72)';
const BORDER = 'rgba(255,255,255,0.10)';

const PRESET = ['#D4AF37', '#C0C0C0', '#7C5CFF', '#00C2C7', '#2ED3A7', '#FF7C7C'];

export default function HabitModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (title: string, color: string, targetPerDay: number) => void;
}) {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(PRESET[0]);
  const [target, setTarget] = useState(1);

  const can = useMemo(() => title.trim().length >= 2, [title]);

  return (
    <Modal transparent visible={visible} animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Neues Habit</Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Name… (z.B. Lesen)"
            placeholderTextColor="rgba(255,255,255,0.50)"
            style={styles.input}
          />

          <Text style={styles.label}>Farbe</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
            {PRESET.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.dot,
                  { backgroundColor: c },
                  color === c && { borderColor: 'rgba(255,255,255,0.95)' },
                ]}
              />
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>Ziel pro Tag</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            {[1, 2, 3].map((n) => (
              <Pressable
                key={n}
                onPress={() => setTarget(n)}
                style={[
                  styles.pill,
                  target === n && { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.30)' },
                ]}
              >
                <Text style={styles.pillText}>{n}×</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={() => {
              if (!can) return;
              onCreate(title.trim(), color, target);
              setTitle('');
              setColor(PRESET[0]);
              setTarget(1);
              onClose();
            }}
            style={[styles.btn, { backgroundColor: color }, !can && { opacity: 0.35 }]}
          >
            <Text style={styles.btnText}>Hinzufügen</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 18 },
  card: { backgroundColor: CARD, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: BORDER },
  title: { color: TEXT, fontWeight: '900', fontSize: 16, marginBottom: 12 },

  label: { color: MUTED, fontWeight: '900', letterSpacing: 0.9, fontSize: 12, marginTop: 10 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 12,
    color: TEXT,
    fontWeight: '900',
    borderWidth: 1,
    borderColor: BORDER,
  },
  dot: { width: 22, height: 22, borderRadius: 99, borderWidth: 2, borderColor: 'rgba(255,255,255,0.18)' },

  pill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: BORDER, backgroundColor: 'rgba(255,255,255,0.06)' },
  pillText: { color: TEXT, fontWeight: '900' },

  btn: { marginTop: 16, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#0B1636', fontWeight: '900' },
});