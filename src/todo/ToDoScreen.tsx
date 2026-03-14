import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTodo } from './useTodo';

const BG = '#2E437A';
const BG_DARK = '#233A73';
const CARD = '#314A86';
const CARD_DARK = '#162E63';
const TEXT = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.72)';
const BORDER = 'rgba(255,255,255,0.10)';
const GOLD = '#D4AF37';

function priorityLabel(priority?: 'low' | 'medium' | 'high') {
  if (priority === 'high') return 'Hoch';
  if (priority === 'low') return 'Niedrig';
  return 'Mittel';
}

export default function ToDoScreen() {
  const {
    state,
    activeCategoryId,
    setActiveCategoryId,
    showCompleted,
    setShowCompleted,
    categoriesWithCounts,
    openTasks,
    completedTasks,
    addTask,
    deleteTask,
    toggleTaskDone,
    toggleTaskReminder,
    clearCompletedTasks,
    addCategory,
  } = useTodo();

  const [addOpen, setAddOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [catId, setCatId] = useState(state.categories[0]?.id ?? 'business');

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(GOLD);

  const glow = useRef(new Animated.Value(0.65)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.65,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [glow]);

  const accentColor = useMemo(() => {
    if (activeCategoryId) {
      return state.categories.find((category) => category.id === activeCategoryId)?.color ?? GOLD;
    }
    return state.categories[0]?.color ?? GOLD;
  }, [activeCategoryId, state.categories]);

  const visibleTasks = showCompleted ? [...openTasks, ...completedTasks] : openTasks;

  const submit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    addTask({
      title: trimmedTitle,
      categoryId: catId,
      note,
      subcategory,
      priority,
    });

    setTitle('');
    setNote('');
    setSubcategory('');
    setPriority('medium');
    setAddOpen(false);
  };

  const submitCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    addCategory(trimmed, newCategoryColor);
    setNewCategoryName('');
    setNewCategoryColor(GOLD);
    setCategoryOpen(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Todos</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Kategorien</Text>

            <View style={styles.headerRightRow}>
              <Pressable onPress={() => setCategoryOpen(true)} style={styles.categoryAddBtn}>
                <Ionicons name="add" size={16} color={GOLD} />
                <Text style={styles.categoryAddBtnText}>Neue Kategorie</Text>
              </Pressable>

              <Text style={styles.sectionMeta}>{openTasks.length} offen</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            <Pressable
              onPress={() => setActiveCategoryId(null)}
              style={[
                styles.categoryPill,
                !activeCategoryId && { borderColor: GOLD, borderWidth: 2 },
              ]}
            >
              <Text style={styles.categoryPillText}>Alle</Text>
            </Pressable>

            {categoriesWithCounts.map((category) => {
              const active = activeCategoryId === category.id;

              return (
                <Pressable
                  key={category.id}
                  onPress={() => setActiveCategoryId(active ? null : category.id)}
                  style={[
                    styles.categoryPill,
                    active && {
                      borderColor: category.color,
                      borderWidth: 2,
                    },
                  ]}
                >
                  <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                  <Text style={styles.categoryPillText}>
                    {category.name} · {category.count}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Aufgaben</Text>
            <Pressable onPress={() => setShowCompleted((current) => !current)} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>
                {showCompleted
                  ? 'Erledigte ausblenden'
                  : `Erledigte anzeigen (${completedTasks.length})`}
              </Text>
            </Pressable>
          </View>

          {visibleTasks.length === 0 ? (
            <Text style={styles.emptyText}>
              {showCompleted
                ? 'Keine Aufgaben in dieser Ansicht.'
                : 'Keine offenen Aufgaben. Sehr stark.'}
            </Text>
          ) : (
            visibleTasks.map((task) => {
              const category = state.categories.find((item) => item.id === task.categoryId);
              const accent = category?.color ?? accentColor;

              return (
                <View key={task.id} style={[styles.taskCard, task.done && styles.taskCardDone]}>
                  <Pressable onPress={() => toggleTaskDone(task.id)} style={styles.taskMain}>
                    <View
                      style={[
                        styles.check,
                        { borderColor: accent },
                        task.done && { backgroundColor: accent },
                      ]}
                    >
                      {task.done ? <Ionicons name="checkmark" size={15} color="#0B1636" /> : null}
                    </View>

                    <View style={styles.taskContent}>
                      <Text style={[styles.taskTitle, task.done && styles.taskTitleDone]}>{task.title}</Text>

                      <View style={styles.metaRow}>
                        <Text style={[styles.metaText, { color: accent }]}>{category?.name ?? 'Kategorie'}</Text>
                        {task.subcategory ? <Text style={styles.metaText}>• {task.subcategory}</Text> : null}
                        <Text style={styles.metaText}>• {priorityLabel(task.priority)}</Text>
                      </View>

                      {task.note ? <Text style={styles.noteText}>{task.note}</Text> : null}
                    </View>
                  </Pressable>

                  <View style={styles.taskActions}>
                    {!task.done ? (
                      <Pressable onPress={() => toggleTaskReminder(task.id)} style={styles.iconBtn}>
                        <Ionicons
                          name={task.reminderEnabled ? 'notifications' : 'notifications-outline'}
                          size={18}
                          color={TEXT}
                        />
                      </Pressable>
                    ) : null}

                    <Pressable
                      onPress={() => {
                        Alert.alert(
                          'Todo löschen',
                          'Möchtest du dieses Todo wirklich löschen?',
                          [
                            { text: 'Abbrechen', style: 'cancel' },
                            {
                              text: 'Löschen',
                              style: 'destructive',
                              onPress: () => deleteTask(task.id),
                            },
                          ],
                        );
                      }}
                      style={styles.iconBtn}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ffb4b4" />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}

          {completedTasks.length > 0 ? (
            <Pressable
              onPress={() => {
                Alert.alert(
                  'Erledigte löschen',
                  'Möchtest du alle erledigten Todos endgültig löschen?',
                  [
                    { text: 'Abbrechen', style: 'cancel' },
                    {
                      text: 'Löschen',
                      style: 'destructive',
                      onPress: () => clearCompletedTasks(),
                    },
                  ],
                );
              }}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>Alle erledigten löschen</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <Animated.View
        style={[
          styles.fabGlow,
          {
            opacity: glow,
            shadowOpacity: glow,
            borderColor: accentColor,
          },
        ]}
      />
      <Pressable
        onPress={() => {
          setCatId(activeCategoryId ?? state.categories[0]?.id ?? 'business');
          setAddOpen(true);
        }}
        style={[styles.fab, { backgroundColor: '#d8d8d8' }]}
      >
        <Ionicons name="add" size={28} color="#0B1636" />
      </Pressable>

      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Neues Todo</Text>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Zum Beispiel: Ersten Trainingsplan festlegen"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.input}
            />

            <TextInput
              value={subcategory}
              onChangeText={setSubcategory}
              placeholder="Unterkategorie, z. B. Start / Fokus / Review"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.input}
            />

            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Kurzer Zusatz oder Beschreibung"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={[styles.input, styles.textarea]}
              multiline
            />

            <Text style={styles.modalSectionLabel}>Priorität</Text>
            <View style={styles.pillRow}>
              {(['low', 'medium', 'high'] as const).map((item) => {
                const active = priority === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setPriority(item)}
                    style={[styles.modalPill, active && styles.modalPillActive]}
                  >
                    <Text style={[styles.modalPillText, active && styles.modalPillTextActive]}>
                      {priorityLabel(item)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.modalSectionLabel}>Kategorie</Text>
            <View style={styles.pillRow}>
              {state.categories.map((category) => {
                const active = catId === category.id;
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => setCatId(category.id)}
                    style={[
                      styles.modalPill,
                      { borderColor: category.color },
                      active && { backgroundColor: 'rgba(255,255,255,0.10)' },
                    ]}
                  >
                    <Text style={styles.modalPillText}>{category.name}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <Pressable onPress={() => setAddOpen(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Abbrechen</Text>
              </Pressable>

              <Pressable onPress={submit} style={styles.submitBtn}>
                <Text style={styles.submitBtnText}>Hinzufügen</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={categoryOpen} transparent animationType="slide" onRequestClose={() => setCategoryOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Neue Kategorie</Text>

            <TextInput
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Name der Kategorie"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.input}
            />

            <Text style={styles.modalSectionLabel}>Farbe</Text>
            <View style={styles.pillRow}>
              {['#D4AF37', '#C0C0C0', '#5BC0BE', '#FF8A80', '#7C5CFF'].map((color) => {
                const active = newCategoryColor === color;
                return (
                  <Pressable
                    key={color}
                    onPress={() => setNewCategoryColor(color)}
                    style={[
                      styles.colorDot,
                      { backgroundColor: color },
                      active && styles.colorDotActive,
                    ]}
                  />
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <Pressable onPress={() => setCategoryOpen(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Abbrechen</Text>
              </Pressable>

              <Pressable onPress={submitCategory} style={styles.submitBtn}>
                <Text style={styles.submitBtnText}>Anlegen</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    paddingTop: 24,
    paddingHorizontal: 18,
    paddingBottom: 110,
    gap: 16,
  },
  header: {
    backgroundColor: BG_DARK,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },
  title: {
    color: TEXT,
    fontSize: 28,
    fontWeight: '900',
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    color: TEXT,
    fontWeight: '900',
    fontSize: 16,
  },
  sectionMeta: {
    color: GOLD,
    fontWeight: '900',
    fontSize: 13,
  },
  categoryAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  categoryAddBtnText: {
    color: GOLD,
    fontWeight: '800',
    fontSize: 12,
  },
  categoryRow: {
    gap: 10,
    paddingTop: 12,
    paddingRight: 6,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  categoryPillText: {
    color: TEXT,
    fontWeight: '800',
    fontSize: 13,
  },
  categoryDot: {
    width: 9,
    height: 9,
    borderRadius: 99,
  },
  secondaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  secondaryButtonText: {
    color: TEXT,
    fontWeight: '800',
    fontSize: 12,
  },
  emptyText: {
    color: MUTED,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 16,
  },
  taskCard: {
    marginTop: 12,
    borderRadius: 18,
    padding: 12,
    backgroundColor: CARD_DARK,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    gap: 10,
  },
  taskCardDone: {
    opacity: 0.78,
  },
  taskMain: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    color: TEXT,
    fontWeight: '900',
    fontSize: 15,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: 'rgba(255,255,255,0.72)',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  metaText: {
    color: MUTED,
    fontWeight: '800',
    fontSize: 12,
  },
  noteText: {
    color: 'rgba(255,255,255,0.86)',
    marginTop: 8,
    lineHeight: 19,
    fontSize: 13,
  },
  taskActions: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  clearButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  clearButtonText: {
    color: '#ffb4b4',
    fontWeight: '800',
    fontSize: 12,
  },
  fabGlow: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 76,
    height: 76,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: GOLD,
    shadowRadius: 18,
    elevation: 16,
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 60,
    height: 60,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(6,10,22,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: BG_DARK,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    borderTopWidth: 1,
    borderColor: BORDER,
  },
  modalTitle: {
    color: TEXT,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 14,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    color: TEXT,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    marginBottom: 12,
  },
  textarea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  modalSectionLabel: {
    color: MUTED,
    fontWeight: '900',
    marginBottom: 8,
    marginTop: 2,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  modalPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  modalPillActive: {
    backgroundColor: 'rgba(212,175,55,0.16)',
    borderColor: 'rgba(212,175,55,0.28)',
  },
  modalPillText: {
    color: TEXT,
    fontWeight: '800',
    fontSize: 13,
  },
  modalPillTextActive: {
    color: GOLD,
  },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: 99,
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cancelBtnText: {
    color: TEXT,
    fontWeight: '900',
  },
  submitBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: GOLD,
  },
  submitBtnText: {
    color: '#0B1636',
    fontWeight: '900',
  },
});