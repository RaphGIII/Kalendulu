import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import GoalDetailScreen from '../../src/psyche/GoalDetailScreen';
import { loadPsycheGoals } from '../../src/psyche/storage';
import type { PsycheGoal } from '../../src/psyche/types';
import { PSYCHE_THEME } from '../../src/psyche/styles';

export default function GoalDetailRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<PsycheGoal[]>([]);

  const goalId = useMemo(() => {
    if (Array.isArray(params.id)) return params.id[0] ?? null;
    return params.id ?? null;
  }, [params.id]);

  const selectedGoal = useMemo(
    () => goals.find((goal) => goal.id === goalId) ?? null,
    [goals, goalId],
  );

  useEffect(() => {
    (async () => {
      try {
        const storedGoals = await loadPsycheGoals();
        setGoals(storedGoals ?? []);
      } catch (error) {
        console.error(error);
        Alert.alert('Fehler', 'Das Ziel konnte nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#D4AF37" />
          <Text style={styles.infoText}>Ziel wird geladen ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedGoal) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.title}>Ziel nicht gefunden</Text>
          <Text style={styles.infoText}>
            Das Ziel existiert nicht mehr oder konnte nicht geladen werden.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GoalDetailScreen
      goal={selectedGoal}
      onClose={() => router.back()}
      onRemove={() => router.back()}
      onApply={() => {}}
      onAdjustIntensity={() => {}}
    />
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PSYCHE_THEME.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  infoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
});