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
import { EVENT_COLORS } from './colors';

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

  // ✅ Wenn edit-event gesetzt wird, Felder vorbefüllen
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
      // create defaults
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

    // combine date with times
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
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{isEdit ? 'Termin bearbeiten' : 'Neuer Termin'}</Text>

          <TextInput
            placeholder="Titel"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            returnKeyType="done"
          />

          <TextInput
            placeholder="Ort (optional)"
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
                style={[
                  styles.colorCircle,
                  { backgroundColor: c },
                  color === c && styles.colorSelected,
                ]}
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
                <Text style={{ color: 'white', fontWeight: '900' }}>Löschen</Text>
              </Pressable>
            ) : (
              <Pressable onPress={closeOnly} style={styles.cancelBtn}>
                <Text style={{ fontWeight: '700' }}>Abbrechen</Text>
              </Pressable>
            )}

            <Pressable onPress={handleSubmit} style={styles.saveBtn}>
              <Text style={{ color: 'white', fontWeight: '900' }}>
                {isEdit ? 'Speichern' : 'Erstellen'}
              </Text>
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
                  <Text style={{ fontWeight: '900', color: 'white' }}>Fertig</Text>
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
    backgroundColor: 'rgba(0,0,0,0.32)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'white',
    borderRadius: 22,
    padding: 18,
  },
  title: { fontSize: 18, fontWeight: '900', marginBottom: 12, color: '#202124' },
  input: {
    borderWidth: 1,
    borderColor: '#E8EAF2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    fontWeight: '700',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6, marginBottom: 12 },
  pill: {
    backgroundColor: '#F7F8FC',
    borderWidth: 1,
    borderColor: '#E8EAF2',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pillText: { fontWeight: '800', color: '#202124' },

  label: { fontWeight: '900', marginBottom: 8, color: '#202124' },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 14, flexWrap: 'wrap' },
  colorCircle: { width: 28, height: 28, borderRadius: 14 },
  colorSelected: { borderWidth: 2, borderColor: '#202124' },

  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 8 },

  deleteBtn: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveBtn: {
    backgroundColor: '#5B67F1',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },

  pickerWrap: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEF0F6',
    paddingTop: 12,
  },
  doneBtn: {
    marginTop: 10,
    alignSelf: 'flex-end',
    backgroundColor: '#5B67F1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
});