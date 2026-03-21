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
import { useAppTheme } from '@/src/theme/ThemeProvider';

function priorityLabel(priority?: 'low' | 'medium' | 'high') {
  if (priority === 'high') return 'Hoch';
  if (priority === 'low') return 'Niedrig';
  return 'Mittel';
}

function getThemedCategoryColor(
  category: { id: string; name?: string } | undefined,
  accentPalette: string[],
  fallback: string,
) {
  if (!category) return fallback;
  if (!accentPalette.length) return fallback;

  const seed = Math.abs((category.name?.length ?? 0) + category.id.length);
  return accentPalette[seed % accentPalette.length] ?? fallback;
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

  const { colors, fontFamily, accentPalette } = useAppTheme();

  const [addOpen, setAddOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [catId, setCatId] = useState(state.categories[0]?.id ?? 'business');

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(
    accentPalette[0] ?? colors.primary
  );

  const glow = useRef(new Animated.Value(0.65)).current;

  const styles = useMemo(() => createStyles(colors, fontFamily), [colors, fontFamily]);

  useEffect(() => {
    const animation = Animated.loop(
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
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [glow]);

  useEffect(() => {
    setNewCategoryColor(accentPalette[0] ?? colors.primary);
  }, [accentPalette, colors.primary]);

  const visibleTasks = showCompleted ? [...openTasks, ...completedTasks] : openTasks;

  function submit() {
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
  }

  function submitCategory() {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    addCategory(trimmed, newCategoryColor);
    setNewCategoryName('');
    setNewCategoryColor(accentPalette[0] ?? colors.primary);
    setCategoryOpen(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.rowBetween}>
            <Text style={styles.title}>Todos</Text>

            <View style={styles.headerRightRow}>
              <Pressable onPress={() => setCategoryOpen(true)} style={styles.categoryAddBtn}>
                <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.categoryAddBtnText}>Neue Kategorie</Text>
              </Pressable>

              <Text style={styles.sectionMeta}>{openTasks.length} offen</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Kategorien</Text>

            <Pressable
              onPress={() => setShowCompleted((current) => !current)}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                {showCompleted
                  ? 'Erledigte ausblenden'
                  : `Erledigte anzeigen (${completedTasks.length})`}
              </Text>
            </Pressable>
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
                !activeCategoryId && {
                  borderColor: colors.primary,
                  borderWidth: 2,
                },
              ]}
            >
              <View style={[styles.categoryDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.categoryPillText}>Alle</Text>
            </Pressable>

            {categoriesWithCounts.map((category) => {
              const active = activeCategoryId === category.id;
              const themedCategoryColor = getThemedCategoryColor(
                category,
                accentPalette,
                colors.primary
              );

              return (
                <Pressable
                  key={category.id}
                  onPress={() => setActiveCategoryId(active ? null : category.id)}
                  style={[
                    styles.categoryPill,
                    active && {
                      borderColor: themedCategoryColor,
                      borderWidth: 2,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.categoryDot,
                      {
                        backgroundColor: themedCategoryColor,
                      },
                    ]}
                  />
                  <Text style={styles.categoryPillText}>
                    {category.name} · {category.count}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Aufgaben</Text>

          {visibleTasks.length === 0 ? (
            <Text style={styles.emptyText}>
              {showCompleted
                ? 'Keine Aufgaben in dieser Ansicht.'
                : 'Keine offenen Aufgaben. Sehr stark.'}
            </Text>
          ) : (
            visibleTasks.map((task) => {
              const category = state.categories.find((item) => item.id === task.categoryId);
              const accent = getThemedCategoryColor(category, accentPalette, colors.primary);

              return (
                <View
                  key={task.id}
                  style={[
                    styles.taskCard,
                    task.done && styles.taskCardDone,
                  ]}
                >
                  <Pressable onPress={() => toggleTaskDone(task.id)} style={styles.taskMain}>
                    <View
                      style={[
                        styles.check,
                        {
                          borderColor: accent || colors.primary,
                          backgroundColor: task.done ? (accent || colors.primary) : 'transparent',
                        },
                      ]}
                    >
                      {task.done ? (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      ) : null}
                    </View>

                    <View style={styles.taskContent}>
                      <Text style={[styles.taskTitle, task.done && styles.taskTitleDone]}>
                        {task.title}
                      </Text>

                      <View style={styles.metaRow}>
                        <Text style={styles.metaText}>{category?.name ?? 'Kategorie'}</Text>
                        {task.subcategory ? (
                          <Text style={styles.metaText}>• {task.subcategory}</Text>
                        ) : null}
                        <Text style={styles.metaText}>• {priorityLabel(task.priority)}</Text>
                      </View>

                      {task.note ? <Text style={styles.noteText}>{task.note}</Text> : null}
                    </View>
                  </Pressable>

                  <View style={styles.taskActions}>
                    {!task.done ? (
                      <Pressable
                        onPress={() => toggleTaskReminder(task.id)}
                        style={styles.iconBtn}
                      >
                        <Ionicons
                          name={task.reminderId ? 'notifications' : 'notifications-outline'}
                          size={18}
                          color={task.reminderId ? colors.warning : colors.text}
                        />
                      </Pressable>
                    ) : (
                      <View style={styles.iconPlaceholder} />
                    )}

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
                          ]
                        );
                      }}
                      style={styles.iconBtn}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
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
                  ]
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
        pointerEvents="none"
        style={[
          styles.fabGlow,
          {
            backgroundColor: colors.primary,
            opacity: glow.interpolate({
              inputRange: [0.65, 1],
              outputRange: [0.14, 0.32],
            }),
          },
        ]}
      />

      <Pressable
        onPress={() => {
          setCatId(activeCategoryId ?? state.categories[0]?.id ?? 'business');
          setAddOpen(true);
        }}
        style={[styles.fab, { backgroundColor: colors.primary }]}
      >
        <Ionicons name="add" size={30} color={colors.primaryText} />
      </Pressable>

      <Modal
        visible={addOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAddOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Neues Todo</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Titel"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />

              <TextInput
                value={subcategory}
                onChangeText={setSubcategory}
                placeholder="Unterkategorie"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />

              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Notiz"
                placeholderTextColor={colors.textMuted}
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
                      <Text
                        style={[
                          styles.modalPillText,
                          active && styles.modalPillTextActive,
                        ]}
                      >
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
                  const themedCategoryColor = getThemedCategoryColor(
                    category,
                    accentPalette,
                    colors.primary
                  );

                  return (
                    <Pressable
                      key={category.id}
                      onPress={() => setCatId(category.id)}
                      style={[
                        styles.modalPill,
                        { borderColor: themedCategoryColor },
                        active && { backgroundColor: colors.primary + '22' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalPillText,
                          active && { color: themedCategoryColor },
                        ]}
                      >
                        {category.name}
                      </Text>
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
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={categoryOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Neue Kategorie</Text>

            <TextInput
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Kategoriename"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />

            <Text style={styles.modalSectionLabel}>Farbe</Text>
            <View style={styles.pillRow}>
              {accentPalette.map((color) => {
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

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fontFamily: ReturnType<typeof useAppTheme>['fontFamily']
) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingTop: 24,
      paddingHorizontal: 18,
      paddingBottom: 110,
      gap: 16,
    },
    header: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '900',
      fontFamily: fontFamily.bold,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
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
      color: colors.text,
      fontWeight: '900',
      fontSize: 16,
      fontFamily: fontFamily.bold,
    },
    sectionMeta: {
      color: colors.primary,
      fontWeight: '900',
      fontSize: 13,
      fontFamily: fontFamily.bold,
    },
    categoryAddBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.cardSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryAddBtnText: {
      color: colors.primary,
      fontWeight: '800',
      fontSize: 12,
      fontFamily: fontFamily.bold,
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
      backgroundColor: colors.cardSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryPillText: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 13,
      fontFamily: fontFamily.bold,
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
      backgroundColor: colors.cardSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryButtonText: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 12,
      fontFamily: fontFamily.bold,
    },
    emptyText: {
      color: colors.textMuted,
      fontWeight: '700',
      lineHeight: 20,
      marginTop: 16,
      fontFamily: fontFamily.regular,
    },
    taskCard: {
      marginTop: 12,
      borderRadius: 18,
      padding: 12,
      backgroundColor: colors.cardSecondary,
      borderWidth: 1,
      borderColor: colors.border,
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
      color: colors.text,
      fontWeight: '900',
      fontSize: 15,
      fontFamily: fontFamily.bold,
    },
    taskTitleDone: {
      textDecorationLine: 'line-through',
      color: colors.textMuted,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 6,
    },
    metaText: {
      color: colors.textMuted,
      fontWeight: '800',
      fontSize: 12,
      fontFamily: fontFamily.regular,
    },
    noteText: {
      color: colors.text,
      marginTop: 8,
      lineHeight: 19,
      fontSize: 13,
      fontFamily: fontFamily.regular,
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
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconPlaceholder: {
      width: 36,
      height: 36,
    },
    clearButton: {
      marginTop: 14,
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.cardSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    clearButtonText: {
      color: colors.danger,
      fontWeight: '800',
      fontSize: 12,
      fontFamily: fontFamily.bold,
    },
    fabGlow: {
      position: 'absolute',
      right: 10,
      bottom: 10,
      width: 76,
      height: 76,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.primary + '55',
      shadowColor: colors.primary,
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
      backgroundColor: colors.backgroundSecondary,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 18,
      borderTopWidth: 1,
      borderColor: colors.border,
      maxHeight: '88%',
    },
    modalTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '900',
      marginBottom: 14,
      fontFamily: fontFamily.bold,
    },
    input: {
      backgroundColor: colors.cardSecondary,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 15,
      marginBottom: 12,
      fontFamily: fontFamily.regular,
    },
    textarea: {
      minHeight: 88,
      textAlignVertical: 'top',
    },
    modalSectionLabel: {
      color: colors.textMuted,
      fontWeight: '900',
      marginBottom: 8,
      marginTop: 2,
      fontFamily: fontFamily.bold,
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
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.cardSecondary,
    },
    modalPillActive: {
      backgroundColor: colors.primary + '22',
      borderColor: colors.primary + '66',
    },
    modalPillText: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 13,
      fontFamily: fontFamily.bold,
    },
    modalPillTextActive: {
      color: colors.primary,
    },
    colorDot: {
      width: 30,
      height: 30,
      borderRadius: 99,
    },
    colorDotActive: {
      borderWidth: 3,
      borderColor: colors.text,
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
      backgroundColor: colors.cardSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelBtnText: {
      color: colors.text,
      fontWeight: '900',
      fontFamily: fontFamily.bold,
    },
    submitBtn: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: colors.primary,
    },
    submitBtnText: {
      color: colors.primaryText,
      fontWeight: '900',
      fontFamily: fontFamily.bold,
    },
  });
}