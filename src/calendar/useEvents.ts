import { useState } from 'react';
import { CalEvent } from './types';

export function useEvents() {
  const [events, setEvents] = useState<CalEvent[]>([]);

  function addEvent(event: CalEvent) {
    setEvents((prev) => [...prev, event]);
  }

  function updateEvent(updated: CalEvent) {
    setEvents((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e))
    );
  }

  function deleteEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  return {
    events,
    addEvent,
    updateEvent,
    deleteEvent,
  };
}