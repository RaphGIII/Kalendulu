import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal } from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/de';

import { PSYCHE_THEME, GOLD } from './styles';
import { loadPsycheHistory, loadPsycheSettings, savePsycheHistory, savePsycheSettings } from './storage';
import { loadCalendarEventsBestEffort, loadHabitsState, loadTodoStateBestEffort } from './adapters';
import { computeSignals } from './engine/computeSignals';
import { buildProfile } from './engine/buildProfile';
import { generateReflection } from './engine/generateReflection';
import { MotivationStyleId, PsycheDailySnapshot, PsycheSettings } from './types';

dayjs.locale('de');

const DEFAULT_SETTINGS: PsycheSettings = { style: 'winner', intensity: 2 };

const STYLE_LABEL: Record<MotivationStyleId, string> = {
  winner: 'Winner',
  coach: 'Coach',
  stoic: 'Stoic',
  friend: 'Friend',
};

export default function PsycheScreen() {
  const [settings, setSettings] = useState<PsycheSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [history, setHistory] = useState<PsycheDailySnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const todayKey = useMemo(() => dayjs().format('YYYY-MM-DD'), []);

  const latest = useMemo(() => history[history.length - 1] ?? null, [history]);

  const reflection = useMemo(() => {
    if (!latest) return null;
    return generateReflection({
      style: settings.style,
      intensity: settings.intensity,
      profile: latest.profile,
      signals: latest.signals,
    });
  }, [latest, settings]);

  async function refreshSnapshot() {
    const habits = await loadHabitsState();
    const todo = await loadTodoStateBestEffort();
    const calendarEvents = await loadCalendarEventsBestEffort();

    const histSignals = history.map((h) => h.signals);
    const signals = computeSignals({ habits, todo, calendarEvents, historySignals: histSignals });
    const profile = buildProfile(signals);

    const snap: PsycheDailySnapshot = { dateKey: dayjs().format('YYYY-MM-DD'), signals, profile };

    // replace today's snapshot or append
    const next = [...history];
    const idx = next.findIndex((x) => x.dateKey === snap.dateKey);
    if (idx >= 0) next[idx] = snap;
    else next.push(snap);

    // keep last 30 days
    const trimmed = next.slice(Math.max(0, next.length - 30));

    setHistory(trimmed);
    await savePsycheHistory(trimmed);
  }

  useEffect(() => {
    (async () => {
      const [s, h] = await Promise.all([loadPsycheSettings(), loadPsycheHistory()]);
      if (s) setSettings(s);
      setHistory(h);
      setLoading(false);

      // if no snapshot today, create one immediately
      const hasToday = h.some((x) => x.dateKey === todayKey);
      if (!hasToday) {
        // avoid using stale 'history' state here; use h directly
        const habits = await loadHabitsState();
        const todo = await loadTodoStateBestEffort();
        const calendarEvents = await loadCalendarEventsBestEffort();
        const histSignals = h.map((x) => x.signals);

        const signals = computeSignals({ habits, todo, calendarEvents, historySignals: histSignals });
        const profile = buildProfile(signals);
        const snap: PsycheDailySnapshot = { dateKey: todayKey, signals, profile };

        const next = [...h, snap].slice(Math.max(0, h.length + 1 - 30));
        setHistory(next);
        await savePsycheHistory(next);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    savePsycheSettings(settings);
  }, [settings]);

  return (
    <View style={{ flex: 1, backgroundColor: PSYCHE_THEME.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>Psyche</Text>
          <Text style={styles.sub}>AI Reflection · {STYLE_LABEL[settings.style]} · Intensität {settings.intensity}</Text>
        </View>

        <Pressable onPress={() => setSettingsOpen(true)} style={styles.iconBtn}>
          <Text style={styles.iconBtnText}>⚙︎</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 140 }}>
        {loading || !latest ? (
          <Text style={{ color: PSYCHE_THEME.muted, fontWeight: '900' }}>Lade…</Text>
        ) : (
          <>
            {/* Profile */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Mindset Profil</Text>

              <StatRow label="Disziplin" value={latest.profile.discipline} />
              <StatRow label="Konstanz" value={latest.profile.consistency} />
              <StatRow label="Fokus" value={latest.profile.focus} />
              <StatRow label="Struktur" value={latest.profile.planning} />
              <StatRow label="Recovery" value={latest.profile.recovery} />
              <StatRow label="Momentum" value={latest.profile.momentum} />
            </View>

            {/* Reflection */}
            {reflection && (
              <View style={[styles.card, { marginTop: 14 }]}>
                <Text style={styles.cardTitle}>{reflection.title}</Text>
                <Text style={styles.body}>{reflection.body}</Text>

                <View style={{ marginTop: 12, padding: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: PSYCHE_THEME.border }}>
                  <Text style={styles.microTitle}>Nächster Schritt</Text>
                  <Text style={styles.micro}>{reflection.microAction}</Text>
                </View>

                <View style={styles.tagRow}>
                  {reflection.tags.slice(0, 4).map((t) => (
                    <View key={t} style={styles.tag}>
                      <Text style={styles.tagText}>{t}</Text>
                    </View>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <Pressable onPress={() => refreshSnapshot()} style={[styles.primaryBtn, { backgroundColor: GOLD }]}>
                    <Text style={styles.primaryText}>Neu analysieren</Text>
                  </Pressable>

                  <Pressable onPress={() => setSettingsOpen(true)} style={styles.secondaryBtn}>
                    <Text style={styles.secondaryText}>Stil ändern</Text>
                  </Pressable>
                </View>

                <Text style={styles.hint}>
                  Hinweis: Habits werden sicher geladen. To-Do/Kalender werden geladen, wenn sie bei dir gespeichert sind.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Settings Modal */}
      <Modal visible={settingsOpen} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setSettingsOpen(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.modalTitle}>Motivation einstellen</Text>

            <Text style={styles.modalLabel}>Stil</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
              {(['winner', 'coach', 'stoic', 'friend'] as MotivationStyleId[]).map((id) => {
                const active = settings.style === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setSettings((s) => ({ ...s, style: id }))}
                    style={[
                      styles.pill,
                      active && { borderColor: GOLD, backgroundColor: 'rgba(212,175,55,0.12)' },
                    ]}
                  >
                    <Text style={styles.pillText}>{STYLE_LABEL[id]}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.modalLabel, { marginTop: 14 }]}>Intensität</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              {[1, 2, 3].map((n) => {
                const active = settings.intensity === n;
                return (
                  <Pressable
                    key={n}
                    onPress={() => setSettings((s) => ({ ...s, intensity: n as 1 | 2 | 3 }))}
                    style={[
                      styles.pill,
                      active && { borderColor: GOLD, backgroundColor: 'rgba(212,175,55,0.12)' },
                    ]}
                  >
                    <Text style={styles.pillText}>{n === 1 ? 'Soft' : n === 2 ? 'Normal' : 'Hard'}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable onPress={() => setSettingsOpen(false)} style={[styles.primaryBtn, { backgroundColor: GOLD, marginTop: 16 }]}>
              <Text style={styles.primaryText}>Fertig</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: PSYCHE_THEME.muted, fontWeight: '900' }}>{label}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.92)', fontWeight: '900' }}>{value}</Text>
      </View>
      <View style={{ height: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: PSYCHE_THEME.border, marginTop: 8, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: GOLD }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: PSYCHE_THEME.bgDark,
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  h1: { color: PSYCHE_THEME.text, fontSize: 28, fontWeight: '900' },
  sub: { marginTop: 6, color: PSYCHE_THEME.muted, fontWeight: '900' },

  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: { color: 'rgba(255,255,255,0.92)', fontWeight: '900', fontSize: 16, marginTop: -1 },

  card: {
    backgroundColor: PSYCHE_THEME.cardDark,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
  },
  cardTitle: { color: PSYCHE_THEME.text, fontWeight: '900', fontSize: 16 },

  body: { marginTop: 10, color: 'rgba(255,255,255,0.88)', fontWeight: '800', lineHeight: 20 },

  microTitle: { color: PSYCHE_THEME.muted, fontWeight: '900', letterSpacing: 1.0, fontSize: 12 },
  micro: { marginTop: 6, color: 'rgba(255,255,255,0.92)', fontWeight: '900' },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  tag: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: PSYCHE_THEME.border },
  tagText: { color: 'rgba(255,255,255,0.85)', fontWeight: '900', fontSize: 12 },

  primaryBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  primaryText: { color: '#0B1636', fontWeight: '900', letterSpacing: 0.8 },

  secondaryBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: PSYCHE_THEME.border },
  secondaryText: { color: 'rgba(255,255,255,0.92)', fontWeight: '900' },

  hint: { marginTop: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '800', fontSize: 12 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 16 },
  modal: { backgroundColor: '#0F2454', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: PSYCHE_THEME.border },
  modalTitle: { color: PSYCHE_THEME.text, fontWeight: '900', fontSize: 16 },
  modalLabel: { marginTop: 12, color: PSYCHE_THEME.muted, fontWeight: '900', letterSpacing: 1.0, fontSize: 12 },

  pill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: PSYCHE_THEME.border, backgroundColor: 'rgba(255,255,255,0.06)' },
  pillText: { color: 'rgba(255,255,255,0.92)', fontWeight: '900' },
});