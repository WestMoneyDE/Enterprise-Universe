"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { HoloCard, NeonButton, StatCard } from "@/components/scifi";
import {
  CalendarView,
  CalendarViewType,
  EventModal,
  MiniCalendar,
} from "@/components/calendar";
import {
  useCalendarEvents,
  CalendarEvent,
  CalendarEventInput,
  EVENT_TYPE_COLORS,
} from "@/hooks/use-calendar-events";

// ═══════════════════════════════════════════════════════════════════════════════
// CALENDAR PAGE - Full calendar scheduling interface
// SciFi Command Center styling with integrated event management
// ═══════════════════════════════════════════════════════════════════════════════

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<CalendarViewType>("month");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [initialEventDate, setInitialEventDate] = useState<Date | null>(null);

  const {
    events,
    isLoading,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
  } = useCalendarEvents();

  // Handle clicking on a date cell
  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setInitialEventDate(date);
    setEditingEvent(null);
    setModalOpen(true);
  }, []);

  // Handle clicking on a time slot
  const handleTimeSlotClick = useCallback((date: Date, hour: number) => {
    const eventDate = new Date(date);
    eventDate.setHours(hour, 0, 0, 0);
    setInitialEventDate(eventDate);
    setEditingEvent(null);
    setModalOpen(true);
  }, []);

  // Handle clicking on an event
  const handleEventClick = useCallback((event: CalendarEvent) => {
    setEditingEvent(event);
    setInitialEventDate(null);
    setModalOpen(true);
  }, []);

  // Handle saving an event
  const handleSaveEvent = useCallback(
    (input: CalendarEventInput) => {
      if (editingEvent) {
        updateEvent(editingEvent.id, input);
      } else {
        addEvent(input);
      }
    },
    [editingEvent, addEvent, updateEvent]
  );

  // Handle deleting an event
  const handleDeleteEvent = useCallback(
    (id: string) => {
      deleteEvent(id);
    },
    [deleteEvent]
  );

  // Handle mini calendar date selection
  const handleMiniCalendarSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    setCurrentDate(date);
    setView("day");
  }, []);

  // Get stats
  const todayEvents = getEventsForDate(new Date());
  const upcomingEvents = events
    .filter((e) => new Date(e.start) >= new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 5);

  const eventsByType = {
    meeting: events.filter((e) => e.type === "meeting").length,
    "follow-up": events.filter((e) => e.type === "follow-up").length,
    task: events.filter((e) => e.type === "task").length,
    reminder: events.filter((e) => e.type === "reminder").length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-wider">
            CALENDAR NEXUS
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">
            Scheduling System:{" "}
            <span className="text-neon-green">OPERATIONAL</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NeonButton
            variant="cyan"
            size="sm"
            onClick={() => {
              setEditingEvent(null);
              setInitialEventDate(new Date());
              setModalOpen(true);
            }}
          >
            + New Event
          </NeonButton>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Today's Events"
          value={todayEvents.length.toString()}
          icon="◉"
          variant="cyan"
          status="online"
        />
        <StatCard
          label="This Week"
          value={events
            .filter((e) => {
              const eventDate = new Date(e.start);
              const weekStart = new Date();
              weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekEnd.getDate() + 6);
              return eventDate >= weekStart && eventDate <= weekEnd;
            })
            .length.toString()}
          icon="◈"
          variant="purple"
        />
        <StatCard
          label="Meetings"
          value={eventsByType.meeting.toString()}
          icon="◇"
          variant="gold"
        />
        <StatCard
          label="Total Events"
          value={events.length.toString()}
          icon="★"
          variant="cyan"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          {/* Mini Calendar */}
          <HoloCard title="QUICK NAV" subtitle="Select Date" icon="◉">
            <MiniCalendar
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              selectedDate={selectedDate || undefined}
              onSelectDate={handleMiniCalendarSelect}
              events={events}
              className="border-0 bg-transparent p-0"
            />
          </HoloCard>

          {/* Event Types Legend */}
          <HoloCard title="EVENT TYPES" icon="◈">
            <div className="space-y-2">
              {Object.entries(EVENT_TYPE_COLORS).map(([type, color]) => (
                <div
                  key={type}
                  className="flex items-center justify-between p-2 rounded-lg bg-void-surface/30 border border-white/5"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs font-mono text-white/70 capitalize">
                      {type}
                    </span>
                  </div>
                  <span
                    className="text-xs font-mono"
                    style={{ color }}
                  >
                    {eventsByType[type as keyof typeof eventsByType]}
                  </span>
                </div>
              ))}
            </div>
          </HoloCard>

          {/* Upcoming Events */}
          <HoloCard
            title="UPCOMING"
            subtitle={`Next ${upcomingEvents.length} events`}
            icon="◇"
            variant="purple"
          >
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-white/30 font-mono text-center py-4">
                  No upcoming events
                </p>
              ) : (
                upcomingEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className="w-full p-2 rounded-lg text-left transition-all hover:scale-[1.02] border"
                    style={{
                      backgroundColor: `${event.color}10`,
                      borderColor: `${event.color}30`,
                    }}
                  >
                    <div
                      className="text-[10px] font-mono"
                      style={{ color: event.color }}
                    >
                      {format(new Date(event.start), "MMM d, HH:mm")}
                    </div>
                    <div className="text-sm text-white truncate">
                      {event.title}
                    </div>
                    <div className="text-[10px] text-white/40 truncate">
                      {event.description}
                    </div>
                  </button>
                ))
              )}
            </div>
          </HoloCard>
        </div>

        {/* Main Calendar */}
        <div className="col-span-12 lg:col-span-9">
          <HoloCard
            className="h-[calc(100vh-280px)] min-h-[500px]"
            variant="cyan"
          >
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
                  <span className="text-xs font-mono text-white/50">
                    Loading calendar...
                  </span>
                </div>
              </div>
            ) : (
              <CalendarView
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                view={view}
                onViewChange={setView}
                events={events}
                onEventClick={handleEventClick}
                onDateClick={handleDateClick}
                onTimeSlotClick={handleTimeSlotClick}
                className="h-full border-0"
              />
            )}
          </HoloCard>
        </div>
      </div>

      {/* Event Modal */}
      <EventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        event={editingEvent}
        initialDate={initialEventDate || undefined}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
}
