import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { CalEvent } from './types';
import { EVENT_COLORS, THEME, ACCENT_GOLD } from './colors';

type Props = {
  visible: boolean;
  onClose: () => void;

  // create
  onCreate: (event: CalEvent) => void;

  // edit
  onUpdate: (event: CalEvent) => void;
  onDelete: (id: string) => void;

  defaultDate: Date;
  initialEvent?: CalEvent | null;
};

type PickerKind = 'date' | 'start' | 'end' | null;

function roundTo15Min(d: Date) {
  const m = dayjs(d);
  const mins = m.minute();
  const rounded = Math.round(mins / 15) * 15;
  return m.minute(rounded).second(0).millisecond(0).toDate();
}

export default function EventModal({
  visible,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  defaultDate,
  initialEvent,
}: Props) {
  const isEdit = !!initialEvent;

  const base = useMemo(() => dayjs(defaultDate).second(0).millisecond(0), [defaultDate]);

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [color, setColor] = useState(EVENT_COLORS[0]);

  const [date, setDate] = useState<Date>(base.toDate());
  const [start, setStart] = useState<Date>(roundTo15Min(base.hour(9).minute(0).toDate()));
  const [end, setEnd] = useState<Date>(roundTo15Min(base.hour(10).minute(0).toDate()));

  const [picker, setPicker] = useState<PickerKind>(null);

  useEffect(() => {
    if (!visible) return;

    if (initialEvent) {
      setTitle(initialEvent.title ?? '');
      setLocation(initialEvent.location ?? '');
      setColor(initialEvent.color ?? EVENT_COLORS[0]);

      const s = dayjs(initialEvent.start);
      const e = dayjs(initialEvent.end);
      setDate(s.startOf('day').toDate());
      setStart(roundTo15Min(s.toDate()));
      setEnd(roundTo15Min(e.toDate()));
    } else {
      setTitle('');
      setLocation('');
      setColor(EVENT_COLORS[0]);

      setDate(base.toDate());
      setStart(roundTo15Min(base.hour(9).minute(0).toDate()));
      setEnd(roundTo15Min(base.hour(10).minute(0).toDate()));
    }

    setPicker(null);
  }, [visible, initialEvent, base]);

  function closeOnly() {
    setPicker(null);
    onClose();
  }

  function handleSubmit() {
    const t = title.trim();
    if (!t) return;

    const day = dayjs(date);
    const s = dayjs(start);
    const e = dayjs(end);

    const startDT = day.hour(s.hour()).minute(s.minute()).second(0).millisecond(0);
    let endDT = day.hour(e.hour()).minute(e.minute()).second(0).millisecond(0);

    if (endDT.isSame(startDT) || endDT.isBefore(startDT)) {
      endDT = startDT.add(1, 'hour');
    }

    const payload: CalEvent = {
      id: initialEvent?.id ?? Date.now().toString(),
      title: t,
      location: location.trim() || undefined,
      start: startDT.toDate(),
      end: endDT.toDate(),
      color,
    };

    if (isEdit) onUpdate(payload);
    else onCreate(payload);

    closeOnly();
  }

  const pickerValue =
    picker === 'date' ? date : picker === 'start' ? start : picker === 'end' ? end : new Date();

  const pickerMode = picker === 'date' ? 'date' : 'time';

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <Text style={styles.title}>{isEdit ? 'Termin bearbeiten' : 'Neuer Termin'}</Text>

          <TextInput
            placeholder="Titel"
            placeholderTextColor="rgba(255,255,255,0.45)"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            returnKeyType="done"
          />

          <TextInput
            placeholder="Ort (optional)"
            placeholderTextColor="rgba(255,255,255,0.45)"
            value={location}
            onChangeText={setLocation}
            style={styles.input}
            returnKeyType="done"
          />

          <View style={styles.row}>
            <Pressable onPress={() => setPicker('date')} style={styles.pill}>
              <Text style={styles.pillText}>{dayjs(date).format('DD.MM.YYYY')}</Text>
            </Pressable>

            <Pressable onPress={() => setPicker('start')} style={styles.pill}>
              <Text style={styles.pillText}>Start: {dayjs(start).format('HH:mm')}</Text>
            </Pressable>

            <Pressable onPress={() => setPicker('end')} style={styles.pill}>
              <Text style={styles.pillText}>Ende: {dayjs(end).format('HH:mm')}</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Farbe</Text>
          <View style={styles.colorRow}>
            {EVENT_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[styles.colorCircle, { backgroundColor: c }, color === c && styles.colorSelected]}
              />
            ))}
          </View>

          <View style={styles.buttonRow}>
            {isEdit ? (
              <Pressable
                onPress={() => {
                  if (initialEvent) onDelete(initialEvent.id);
                  closeOnly();
                }}
                style={styles.deleteBtn}
              >
                <Text style={styles.deleteText}>Löschen</Text>
              </Pressable>
            ) : (
              <Pressable onPress={closeOnly} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Abbrechen</Text>
              </Pressable>
            )}

            <Pressable onPress={handleSubmit} style={[styles.saveBtn, { backgroundColor: ACCENT_GOLD }]}>
              <Text style={styles.saveText}>{isEdit ? 'Speichern' : 'Erstellen'}</Text>
            </Pressable>
          </View>

          {!!picker && (
            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={pickerValue}
                mode={pickerMode as any}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                is24Hour
                onChange={(_, selected) => {
                  if (!selected) return;

                  if (picker === 'date') setDate(selected);
                  if (picker === 'start') setStart(roundTo15Min(selected));
                  if (picker === 'end') setEnd(roundTo15Min(selected));

                  if (Platform.OS !== 'ios') setPicker(null);
                }}
              />

              {Platform.OS === 'ios' && (
                <Pressable onPress={() => setPicker(null)} style={styles.doneBtn}>
                  <Text style={styles.doneText}>Fertig</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0F2454',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  title: { fontSize: 18, fontWeight: '900', marginBottom: 12, color: THEME.text },

  input: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    fontWeight: '800',
    color: THEME.text,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6, marginBottom: 12 },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pillText: { fontWeight: '900', color: 'rgba(255,255,255,0.92)' },

  label: { fontWeight: '900', marginBottom: 8, color: THEME.muted, letterSpacing: 0.9 },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 14, flexWrap: 'wrap' },
  colorCircle: { width: 28, height: 28, borderRadius: 14 },
  colorSelected: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)' },

  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 8 },
  cancelText: { fontWeight: '900', color: THEME.muted },

  deleteBtn: {
    backgroundColor: 'rgba(255,59,48,0.92)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  deleteText: { color: 'white', fontWeight: '900' },

  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveText: { color: '#0B1636', fontWeight: '900' },

  pickerWrap: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingTop: 12,
  },
  doneBtn: {
    marginTop: 10,
    alignSelf: 'flex-end',
    backgroundColor: ACCENT_GOLD,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  doneText: { fontWeight: '900', color: '#0B1636' },
});