"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// CALENDAR EVENTS HOOK - Manages calendar events with localStorage persistence
// ═══════════════════════════════════════════════════════════════════════════════

export type CalendarEventType = "meeting" | "follow-up" | "task" | "reminder";
export type LinkedEntityType = "contact" | "deal" | null;

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  type: CalendarEventType;
  linkedEntityType: LinkedEntityType;
  linkedEntityId: string | null;
  color: string;
}

export interface CalendarEventInput {
  title: string;
  description: string;
  start: Date;
  end: Date;
  type: CalendarEventType;
  linkedEntityType?: LinkedEntityType;
  linkedEntityId?: string | null;
}

const STORAGE_KEY = "nexus-calendar-events";

// Event type color mapping
export const EVENT_TYPE_COLORS: Record<CalendarEventType, string> = {
  meeting: "#00F0FF", // neon-cyan
  "follow-up": "#A855F7", // neon-purple
  task: "#FFD93D", // neon-gold
  reminder: "#FF6B6B", // neon-red/orange
};

// Generate unique ID
function generateId(): string {
  return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Serialize events for localStorage
function serializeEvents(events: CalendarEvent[]): string {
  return JSON.stringify(
    events.map((event) => ({
      ...event,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
    }))
  );
}

// Deserialize events from localStorage
function deserializeEvents(data: string): CalendarEvent[] {
  try {
    const parsed = JSON.parse(data);
    return parsed.map(
      (event: {
        id: string;
        title: string;
        description: string;
        start: string;
        end: string;
        type: CalendarEventType;
        linkedEntityType: LinkedEntityType;
        linkedEntityId: string | null;
        color: string;
      }) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      })
    );
  } catch {
    return [];
  }
}

// Sample events for demo
function getSampleEvents(): CalendarEvent[] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return [
    {
      id: generateId(),
      title: "Team Standup",
      description: "Daily sync with engineering team",
      start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0),
      end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 30),
      type: "meeting",
      linkedEntityType: null,
      linkedEntityId: null,
      color: EVENT_TYPE_COLORS.meeting,
    },
    {
      id: generateId(),
      title: "Client Follow-up: Mueller GmbH",
      description: "Review proposal feedback and next steps",
      start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
      end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0),
      type: "follow-up",
      linkedEntityType: "deal",
      linkedEntityId: "deal-001",
      color: EVENT_TYPE_COLORS["follow-up"],
    },
    {
      id: generateId(),
      title: "Complete Project Proposal",
      description: "Finalize proposal for Smart Home project",
      start: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10, 0),
      end: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 12, 0),
      type: "task",
      linkedEntityType: "deal",
      linkedEntityId: "deal-002",
      color: EVENT_TYPE_COLORS.task,
    },
    {
      id: generateId(),
      title: "Contract Review Deadline",
      description: "Final review of contract terms",
      start: new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate(), 9, 0),
      end: new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate(), 10, 0),
      type: "reminder",
      linkedEntityType: null,
      linkedEntityId: null,
      color: EVENT_TYPE_COLORS.reminder,
    },
    {
      id: generateId(),
      title: "Investor Presentation",
      description: "Q1 Results presentation",
      start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 15, 0),
      end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 17, 0),
      type: "meeting",
      linkedEntityType: "contact",
      linkedEntityId: "contact-inv-001",
      color: EVENT_TYPE_COLORS.meeting,
    },
  ];
}

export interface UseCalendarEventsReturn {
  events: CalendarEvent[];
  isLoading: boolean;
  addEvent: (event: CalendarEventInput) => CalendarEvent;
  updateEvent: (id: string, updates: Partial<CalendarEventInput>) => CalendarEvent | null;
  deleteEvent: (id: string) => boolean;
  getEventsForRange: (start: Date, end: Date) => CalendarEvent[];
  getEventsForDate: (date: Date) => CalendarEvent[];
}

export function useCalendarEvents(): UseCalendarEventsReturn {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load events from localStorage on mount
  useEffect(() => {
    setIsLoading(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const loadedEvents = deserializeEvents(stored);
        setEvents(loadedEvents.length > 0 ? loadedEvents : getSampleEvents());
      } else {
        // Initialize with sample events
        const sampleEvents = getSampleEvents();
        setEvents(sampleEvents);
        localStorage.setItem(STORAGE_KEY, serializeEvents(sampleEvents));
      }
    } catch {
      setEvents(getSampleEvents());
    }
    setIsLoading(false);
  }, []);

  // Save events to localStorage whenever they change
  useEffect(() => {
    if (!isLoading && events.length > 0) {
      localStorage.setItem(STORAGE_KEY, serializeEvents(events));
    }
  }, [events, isLoading]);

  // Add a new event
  const addEvent = useCallback((input: CalendarEventInput): CalendarEvent => {
    const newEvent: CalendarEvent = {
      id: generateId(),
      title: input.title,
      description: input.description,
      start: input.start,
      end: input.end,
      type: input.type,
      linkedEntityType: input.linkedEntityType || null,
      linkedEntityId: input.linkedEntityId || null,
      color: EVENT_TYPE_COLORS[input.type],
    };

    setEvents((prev) => [...prev, newEvent]);
    return newEvent;
  }, []);

  // Update an existing event
  const updateEvent = useCallback(
    (id: string, updates: Partial<CalendarEventInput>): CalendarEvent | null => {
      let updatedEvent: CalendarEvent | null = null;

      setEvents((prev) =>
        prev.map((event) => {
          if (event.id === id) {
            updatedEvent = {
              ...event,
              ...updates,
              color: updates.type ? EVENT_TYPE_COLORS[updates.type] : event.color,
            };
            return updatedEvent;
          }
          return event;
        })
      );

      return updatedEvent;
    },
    []
  );

  // Delete an event
  const deleteEvent = useCallback((id: string): boolean => {
    let deleted = false;
    setEvents((prev) => {
      const newEvents = prev.filter((event) => {
        if (event.id === id) {
          deleted = true;
          return false;
        }
        return true;
      });
      return newEvents;
    });
    return deleted;
  }, []);

  // Get events for a date range
  const getEventsForRange = useCallback(
    (start: Date, end: Date): CalendarEvent[] => {
      return events.filter((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return eventStart <= end && eventEnd >= start;
      });
    },
    [events]
  );

  // Get events for a specific date
  const getEventsForDate = useCallback(
    (date: Date): CalendarEvent[] => {
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
      return getEventsForRange(dayStart, dayEnd);
    },
    [getEventsForRange]
  );

  return useMemo(
    () => ({
      events,
      isLoading,
      addEvent,
      updateEvent,
      deleteEvent,
      getEventsForRange,
      getEventsForDate,
    }),
    [events, isLoading, addEvent, updateEvent, deleteEvent, getEventsForRange, getEventsForDate]
  );
}
