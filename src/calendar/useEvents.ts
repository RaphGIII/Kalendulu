import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import { CalEvent } from './types';
import { STORAGE_KEYS } from '../shared/storageKeys';

function normalizeStoredEvent(raw: any): CalEvent | null {
  if (!raw) return null;

  const start = raw.start ? new Date(raw.start) : null;
  const end = raw.end ? new Date(raw.end) : null;

  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  return {
    id: String(raw.id ?? Date.now()),
    title: String(raw.title ?? 'Termin'),
    start,
    end,
    color: raw.color ?? '#D4AF37',
    colorIndex:
      typeof raw.colorIndex === 'number' && raw.colorIndex >= 0 ? raw.colorIndex : 0,
    location: raw.location ? String(raw.location) : undefined,
    description: raw.description ? String(raw.description) : undefined,
  };
}

export function useEvents() {
  const [events, setEvents] = useState<CalEvent[]>([]);

  const loadEvents = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.CALENDAR_EVENTS);

      if (!raw) {
        setEvents([]);
        return;
      }

      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed)
        ? parsed.map(normalizeStoredEvent).filter(Boolean)
        : [];

      setEvents(list as CalEvent[]);
    } catch (e) {
      console.log('Failed to load calendar events', e);
      setEvents([]);
    }
  }, []);

  const saveEvents = useCallback(async (next: CalEvent[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CALENDAR_EVENTS, JSON.stringify(next));
    } catch (e) {
      console.log('Failed to save calendar events', e);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents]),
  );

  const addEvent = useCallback(
    async (event: CalEvent) => {
      const normalized: CalEvent = {
        ...event,
        colorIndex:
          typeof event.colorIndex === 'number' && event.colorIndex >= 0
            ? event.colorIndex
            : 0,
      };

      setEvents((prev) => {
        const next = [...prev, normalized];
        void saveEvents(next);
        return next;
      });
    },
    [saveEvents],
  );

  const updateEvent = useCallback(
    async (updated: CalEvent) => {
      const normalized: CalEvent = {
        ...updated,
        colorIndex:
          typeof updated.colorIndex === 'number' && updated.colorIndex >= 0
            ? updated.colorIndex
            : 0,
      };

      setEvents((prev) => {
        const next = prev.map((event) => (event.id === normalized.id ? normalized : event));
        void saveEvents(next);
        return next;
      });
    },
    [saveEvents],
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      setEvents((prev) => {
        const next = prev.filter((event) => event.id !== id);
        void saveEvents(next);
        return next;
      });
    },
    [saveEvents],
  );

  return {
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    reload: loadEvents,
  };
}