"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  eachHourOfInterval,
  setHours,
  getHours,
  getMinutes,
} from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarEvent, EVENT_TYPE_COLORS } from "@/hooks/use-calendar-events";

// ═══════════════════════════════════════════════════════════════════════════════
// CALENDAR VIEW - Full calendar component with month/week/day views
// SciFi styling with dark cells, cyan borders, and event glow effects
// ═══════════════════════════════════════════════════════════════════════════════

export type CalendarViewType = "month" | "week" | "day";

interface CalendarViewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  view: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  onTimeSlotClick?: (date: Date, hour: number) => void;
  className?: string;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function CalendarView({
  currentDate,
  onDateChange,
  view,
  onViewChange,
  events,
  onEventClick,
  onDateClick,
  onTimeSlotClick,
  className,
}: CalendarViewProps) {
  // Navigation handlers
  const handlePrev = () => {
    if (view === "month") {
      onDateChange(subMonths(currentDate, 1));
    } else if (view === "week") {
      onDateChange(subWeeks(currentDate, 1));
    } else {
      onDateChange(subDays(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (view === "month") {
      onDateChange(addMonths(currentDate, 1));
    } else if (view === "week") {
      onDateChange(addWeeks(currentDate, 1));
    } else {
      onDateChange(addDays(currentDate, 1));
    }
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  // Get title based on view
  const getTitle = () => {
    if (view === "month") {
      return format(currentDate, "MMMM yyyy");
    } else if (view === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
    } else {
      return format(currentDate, "EEEE, MMMM d, yyyy");
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-void-surface/30 border border-neon-cyan/20 rounded-lg overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neon-cyan/10 bg-void-dark/50">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 hover:border-neon-cyan/50 hover:bg-neon-cyan/10 text-white/50 hover:text-neon-cyan transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-mono text-neon-cyan border border-neon-cyan/30 rounded-lg hover:bg-neon-cyan/20 transition-colors"
          >
            TODAY
          </button>

          <button
            onClick={handleNext}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 hover:border-neon-cyan/50 hover:bg-neon-cyan/10 text-white/50 hover:text-neon-cyan transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* Title */}
        <h2 className="font-display text-lg tracking-wider text-white">
          {getTitle()}
        </h2>

        {/* View Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-void-surface/50 border border-white/10">
          {(["month", "week", "day"] as const).map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={cn(
                "px-3 py-1 rounded text-xs font-mono uppercase transition-all",
                view === v
                  ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30"
                  : "text-white/50 hover:text-white"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-auto">
        {view === "month" && (
          <MonthView
            currentDate={currentDate}
            events={events}
            onEventClick={onEventClick}
            onDateClick={onDateClick}
          />
        )}
        {view === "week" && (
          <WeekView
            currentDate={currentDate}
            events={events}
            onEventClick={onEventClick}
            onTimeSlotClick={onTimeSlotClick}
          />
        )}
        {view === "day" && (
          <DayView
            currentDate={currentDate}
            events={events}
            onEventClick={onEventClick}
            onTimeSlotClick={onTimeSlotClick}
          />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MONTH VIEW
// ═══════════════════════════════════════════════════════════════════════════════

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}

function MonthView({
  currentDate,
  events,
  onEventClick,
  onDateClick,
}: MonthViewProps) {
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(new Date(event.start), day));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-neon-cyan/10">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-2 py-2 text-center text-xs font-mono text-white/50 uppercase tracking-wider border-r border-neon-cyan/10 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr">
        {calendarDays.map((day, idx) => {
          const dayIsToday = isToday(day);
          const dayIsCurrentMonth = isSameMonth(day, currentDate);
          const dayEvents = getEventsForDay(day);

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDateClick?.(day)}
              className={cn(
                "min-h-[100px] p-1 border-b border-r border-neon-cyan/10 cursor-pointer transition-colors",
                idx % 7 === 6 && "border-r-0",
                !dayIsCurrentMonth && "bg-void-dark/30",
                dayIsCurrentMonth && "bg-void-surface/20 hover:bg-void-surface/40",
                dayIsToday && "bg-neon-cyan/5"
              )}
            >
              {/* Day Number */}
              <div
                className={cn(
                  "w-6 h-6 flex items-center justify-center rounded-full text-xs font-mono mb-1",
                  dayIsToday
                    ? "bg-neon-cyan text-void-dark font-bold"
                    : dayIsCurrentMonth
                    ? "text-white"
                    : "text-white/30"
                )}
              >
                {format(day, "d")}
              </div>

              {/* Events */}
              <div className="space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((event) => (
                  <EventChip
                    key={event.id}
                    event={event}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] font-mono text-white/40 px-1">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEEK VIEW
// ═══════════════════════════════════════════════════════════════════════════════

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onTimeSlotClick?: (date: Date, hour: number) => void;
}

function WeekView({
  currentDate,
  events,
  onEventClick,
  onTimeSlotClick,
}: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  });

  const getEventsForDayAndHour = (day: Date, hour: number) => {
    return events.filter((event) => {
      const eventStart = new Date(event.start);
      return isSameDay(eventStart, day) && getHours(eventStart) === hour;
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Day Headers */}
      <div className="flex border-b border-neon-cyan/10">
        <div className="w-16 shrink-0" /> {/* Time column spacer */}
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "flex-1 px-2 py-2 text-center border-r border-neon-cyan/10 last:border-r-0",
              isToday(day) && "bg-neon-cyan/10"
            )}
          >
            <div className="text-[10px] font-mono text-white/50 uppercase">
              {format(day, "EEE")}
            </div>
            <div
              className={cn(
                "text-lg font-mono",
                isToday(day) ? "text-neon-cyan font-bold" : "text-white"
              )}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Time Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          {HOURS.map((hour) => (
            <div key={hour} className="flex h-12 border-b border-white/5">
              {/* Time Label */}
              <div className="w-16 shrink-0 pr-2 text-right">
                <span className="text-[10px] font-mono text-white/30">
                  {format(setHours(new Date(), hour), "HH:00")}
                </span>
              </div>

              {/* Day Columns */}
              {weekDays.map((day) => {
                const hourEvents = getEventsForDayAndHour(day, hour);

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    onClick={() => onTimeSlotClick?.(day, hour)}
                    className={cn(
                      "flex-1 border-r border-neon-cyan/5 last:border-r-0 cursor-pointer hover:bg-neon-cyan/5 transition-colors relative",
                      isToday(day) && "bg-neon-cyan/5"
                    )}
                  >
                    {hourEvents.map((event) => (
                      <TimeSlotEvent
                        key={event.id}
                        event={event}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(event);
                        }}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAY VIEW
// ═══════════════════════════════════════════════════════════════════════════════

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onTimeSlotClick?: (date: Date, hour: number) => void;
}

function DayView({
  currentDate,
  events,
  onEventClick,
  onTimeSlotClick,
}: DayViewProps) {
  const dayEvents = events.filter((event) =>
    isSameDay(new Date(event.start), currentDate)
  );

  const getEventsForHour = (hour: number) => {
    return dayEvents.filter((event) => {
      const eventStart = new Date(event.start);
      return getHours(eventStart) === hour;
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="relative">
        {HOURS.map((hour) => {
          const hourEvents = getEventsForHour(hour);

          return (
            <div key={hour} className="flex h-16 border-b border-white/5">
              {/* Time Label */}
              <div className="w-20 shrink-0 pr-3 text-right pt-1">
                <span className="text-xs font-mono text-white/30">
                  {format(setHours(new Date(), hour), "HH:00")}
                </span>
              </div>

              {/* Time Slot */}
              <div
                onClick={() => onTimeSlotClick?.(currentDate, hour)}
                className={cn(
                  "flex-1 cursor-pointer hover:bg-neon-cyan/5 transition-colors relative px-2",
                  isToday(currentDate) && "bg-neon-cyan/5"
                )}
              >
                {hourEvents.map((event) => (
                  <DayViewEvent
                    key={event.id}
                    event={event}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface EventChipProps {
  event: CalendarEvent;
  onClick?: (e: React.MouseEvent) => void;
}

function EventChip({ event, onClick }: EventChipProps) {
  return (
    <button
      onClick={onClick}
      className="w-full px-1.5 py-0.5 rounded text-left truncate text-[10px] font-mono transition-all hover:scale-[1.02]"
      style={{
        backgroundColor: `${event.color}20`,
        borderLeft: `2px solid ${event.color}`,
        color: event.color,
        boxShadow: `0 0 8px ${event.color}30`,
      }}
    >
      {format(new Date(event.start), "HH:mm")} {event.title}
    </button>
  );
}

interface TimeSlotEventProps {
  event: CalendarEvent;
  onClick?: (e: React.MouseEvent) => void;
}

function TimeSlotEvent({ event, onClick }: TimeSlotEventProps) {
  const startMinutes = getMinutes(new Date(event.start));
  const durationMs =
    new Date(event.end).getTime() - new Date(event.start).getTime();
  const durationHours = durationMs / (1000 * 60 * 60);

  return (
    <button
      onClick={onClick}
      className="absolute inset-x-1 px-1 py-0.5 rounded text-left truncate text-[10px] font-mono transition-all hover:scale-[1.02] z-10"
      style={{
        top: `${(startMinutes / 60) * 100}%`,
        height: `${Math.max(durationHours * 48, 20)}px`,
        backgroundColor: `${event.color}30`,
        borderLeft: `2px solid ${event.color}`,
        color: event.color,
        boxShadow: `0 0 12px ${event.color}40`,
      }}
    >
      {event.title}
    </button>
  );
}

interface DayViewEventProps {
  event: CalendarEvent;
  onClick?: (e: React.MouseEvent) => void;
}

function DayViewEvent({ event, onClick }: DayViewEventProps) {
  const startMinutes = getMinutes(new Date(event.start));
  const durationMs =
    new Date(event.end).getTime() - new Date(event.start).getTime();
  const durationHours = durationMs / (1000 * 60 * 60);

  return (
    <button
      onClick={onClick}
      className="absolute left-2 right-2 px-3 py-1.5 rounded-lg text-left transition-all hover:scale-[1.01] z-10"
      style={{
        top: `${(startMinutes / 60) * 100}%`,
        height: `${Math.max(durationHours * 64, 28)}px`,
        backgroundColor: `${event.color}20`,
        borderLeft: `3px solid ${event.color}`,
        boxShadow: `0 0 20px ${event.color}30`,
      }}
    >
      <div className="text-xs font-mono" style={{ color: event.color }}>
        {format(new Date(event.start), "HH:mm")} -{" "}
        {format(new Date(event.end), "HH:mm")}
      </div>
      <div className="text-sm font-display text-white truncate">
        {event.title}
      </div>
      {event.description && durationHours >= 1 && (
        <div className="text-[10px] text-white/50 truncate mt-0.5">
          {event.description}
        </div>
      )}
    </button>
  );
}

export default CalendarView;
