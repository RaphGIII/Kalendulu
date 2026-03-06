import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTodo } from './useTodo';
import CategoryManagerModal from './CategoryManagerModal';
import { configureAndroidChannel, ensureNotificationPermission } from './notifications';

const BG = '#2E437A';
const BG_DARK = '#233A73';
const CARD = '#314A86';
const CARD_DARK = '#162E63';
const TEXT = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.72)';
const BORDER = 'rgba(255,255,255,0.10)';

const GOLD = '#D4AF37';
const SILVER = '#C0C0C0';

export default function ToDoScreen() {
  const {
    state,
    activeCategoryId,
    setActiveCategoryId,
    categoriesWithCounts,
    filteredTasks,
    addTask,
    toggleTaskDone,
    toggleTaskReminder,
    addCategory,
    renameCategory,
    recolorCategory,
    deleteCategory,
  } = useTodo();

  // Notifications master toggle (nur Glocke)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    configureAndroidChannel();
  }, []);

  const accentColor = useMemo(() => {
    if (activeCategoryId) return state.categories.find((c) => c.id === activeCategoryId)?.color ?? GOLD;
    return state.categories[0]?.color ?? GOLD;
  }, [activeCategoryId, state.categories]);

  // FAB pulsing glow
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.45] });

  // Add task modal
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [catId, setCatId] = useState(state.categories[0]?.id ?? 'business');

  // Category edit modal
  const [catEditOpen, setCatEditOpen] = useState(false);

  const submit = () => {
    const t = title.trim();
    if (!t) return;
    addTask(t, catId);
    setTitle('');
    setAddOpen(false);
  };

  const toggleBell = async () => {
    if (!notificationsEnabled) {
      const ok = await ensureNotificationPermission();
      if (!ok) return;
      setNotificationsEnabled(true);
      return;
    }
    setNotificationsEnabled(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Header */}
      <View style={styles.headerTop}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }} />

          <Pressable onPress={toggleBell} style={styles.headerIcon}>
            <Ionicons
              name={notificationsEnabled ? 'notifications' : 'notifications-outline'}
              size={18}
              color="rgba(255,255,255,0.92)"
            />
          </Pressable>
        </View>

        <Text style={styles.title}>What’s up, {state.name}!</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 140 }}>
        {/* Categories row with gold/silver + edit */}
        <View style={styles.sectionRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={styles.section}>CATEGORIES</Text>

            <View style={styles.metalPill}>
              <View style={[styles.metalDot, { backgroundColor: GOLD }]} />
              <Text style={styles.metalText}>Gold</Text>
            </View>

            <View style={styles.metalPill}>
              <View style={[styles.metalDot, { backgroundColor: SILVER }]} />
              <Text style={styles.metalText}>Silver</Text>
            </View>
          </View>

          <Pressable onPress={() => setCatEditOpen(true)} style={styles.editBtn}>
            <Text style={styles.editBtnText}>Bearbeiten</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingVertical: 12 }}>
          {categoriesWithCounts.map((c) => {
            const active = activeCategoryId === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setActiveCategoryId(active ? null : c.id)}
                style={[styles.catCard, active && { borderColor: c.color, borderWidth: 2 }]}
              >
                <Text style={styles.catCount}>{c.count} tasks</Text>
                <Text style={styles.catName}>{c.name}</Text>
                <View style={[styles.catLine, { backgroundColor: c.color, opacity: active ? 1 : 0.6 }]} />
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Tasks */}
        <Text style={[styles.section, { marginTop: 14 }]}>TODAY’S TASKS</Text>

        <View style={{ gap: 12, marginTop: 12 }}>
          {filteredTasks.map((t) => {
            const cat = state.categories.find((c) => c.id === t.categoryId);
            const accent = cat?.color ?? accentColor;

            return (
              <View key={t.id} style={[styles.taskRow, t.done && { opacity: 0.55 }]}>
                <Pressable
                  onPress={() => toggleTaskDone(t.id)}
                  style={[styles.check, { borderColor: accent }, t.done && { backgroundColor: accent }]}
                />
                <Pressable style={{ flex: 1 }} onPress={() => toggleTaskDone(t.id)}>
                  <Text style={[styles.taskText, t.done && { textDecorationLine: 'line-through' }]} numberOfLines={1}>
                    {t.title}
                  </Text>
                </Pressable>

                {/* Reminder bell (funktioniert nur wenn master bell enabled) */}
                <Pressable
                  onPress={() => {
                    if (!notificationsEnabled) return;
                    toggleTaskReminder(t.id);
                  }}
                  style={styles.reminderBtn}
                >
                  <Ionicons
                    name={t.reminderEnabled ? 'alarm' : 'alarm-outline'}
                    size={18}
                    color={notificationsEnabled ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)'}
                  />
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* FAB gold + pulsing glow (passt sich an accentColor an) */}
      <Pressable onPress={() => setAddOpen(true)} style={[styles.fab, { backgroundColor: accentColor }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.fabGlow,
            {
              backgroundColor: accentColor,
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>

      {/* Add Task Modal */}
      <Modal transparent visible={addOpen} animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setAddOpen(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.modalTitle}>Add Task</Text>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Task title…"
              placeholderTextColor="rgba(255,255,255,0.50)"
              style={styles.input}
            />

            <Text style={styles.modalLabel}>Category</Text>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              {state.categories.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setCatId(c.id)}
                  style={[
                    styles.pill,
                    { borderColor: c.color },
                    catId === c.id && { backgroundColor: 'rgba(255,255,255,0.10)' },
                  ]}
                >
                  <View style={[styles.pillDot, { backgroundColor: c.color }]} />
                  <Text style={styles.pillText}>{c.name}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable onPress={submit} style={[styles.addBtn, { backgroundColor: accentColor }]}>
              <Text style={styles.addBtnText}>ADD</Text>
            </Pressable>

            <Text style={styles.hint}>
              Reminder: Tippe rechts beim Task auf das Alarm-Symbol (nur wenn Glocke aktiv ist).
            </Text>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Category edit modal */}
      <CategoryManagerModal
        visible={catEditOpen}
        onClose={() => setCatEditOpen(false)}
        categories={state.categories}
        onAdd={addCategory}
        onRename={renameCategory}
        onRecolor={recolorCategory}
        onDelete={deleteCategory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerTop: {
    backgroundColor: BG_DARK,
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: 12, color: TEXT, fontSize: 28, fontWeight: '900' },

  sectionRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { color: MUTED, fontWeight: '900', letterSpacing: 1.1 },

  metalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  metalDot: { width: 10, height: 10, borderRadius: 99 },
  metalText: { color: 'rgba(255,255,255,0.85)', fontWeight: '900', fontSize: 12 },

  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  editBtnText: { color: 'rgba(255,255,255,0.92)', fontWeight: '900', fontSize: 12 },

  catCard: {
    width: 180,
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  catCount: { color: MUTED, fontWeight: '800' },
  catName: { marginTop: 8, color: TEXT, fontWeight: '900', fontSize: 16 },
  catLine: { marginTop: 12, height: 3, width: 64, borderRadius: 99 },

  taskRow: {
    backgroundColor: CARD_DARK,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  check: { width: 18, height: 18, borderRadius: 999, borderWidth: 2, backgroundColor: 'transparent' },
  taskText: { color: TEXT, fontWeight: '800', flex: 1 },

  reminderBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  fab: {
    position: 'absolute',
    right: 18,
    bottom: 18 + 25,
    width: 60,
    height: 60,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  fabGlow: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 999,
  },
  fabPlus: { color: '#0B1636', fontSize: 32, fontWeight: '900', marginTop: -2 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.40)', justifyContent: 'center', padding: 18 },
  modal: {
    backgroundColor: '#0F2454',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  modalTitle: { color: TEXT, fontWeight: '900', fontSize: 16, marginBottom: 12 },
  modalLabel: { marginTop: 12, color: MUTED, fontWeight: '900' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 12,
    color: TEXT,
    fontWeight: '800',
    borderWidth: 1,
    borderColor: BORDER,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pillDot: { width: 10, height: 10, borderRadius: 99 },
  pillText: { color: TEXT, fontWeight: '900' },

  addBtn: { marginTop: 16, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  addBtnText: { color: '#0B1636', fontWeight: '900', letterSpacing: 1.2 },

  hint: { marginTop: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '800', fontSize: 12 },
});