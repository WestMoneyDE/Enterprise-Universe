"use client";

import { useMemo } from "react";
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
} from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarEvent } from "@/hooks/use-calendar-events";

// ═══════════════════════════════════════════════════════════════════════════════
// MINI CALENDAR - Compact calendar widget for sidebars
// SciFi styling with event indicators and day selection
// ═══════════════════════════════════════════════════════════════════════════════

interface MiniCalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
  events?: CalendarEvent[];
  className?: string;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function MiniCalendar({
  currentDate,
  onDateChange,
  selectedDate,
  onSelectDate,
  events = [],
  className,
}: MiniCalendarProps) {
  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Check if a day has events
  const hasEvents = (day: Date): boolean => {
    return events.some((event) => isSameDay(new Date(event.start), day));
  };

  // Get event count for a day
  const getEventCount = (day: Date): number => {
    return events.filter((event) => isSameDay(new Date(event.start), day)).length;
  };

  const handlePrevMonth = () => {
    onDateChange(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    onDateChange(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    onDateChange(new Date());
    onSelectDate?.(new Date());
  };

  return (
    <div
      className={cn(
        "bg-void-surface/50 border border-neon-cyan/20 rounded-lg p-3",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={handlePrevMonth}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-neon-cyan/20 text-white/50 hover:text-neon-cyan transition-colors"
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

        <div className="flex items-center gap-2">
          <span className="font-display text-sm text-white tracking-wider">
            {format(currentDate, "MMM yyyy")}
          </span>
          <button
            onClick={handleToday}
            className="px-2 py-0.5 text-[10px] font-mono text-neon-cyan/70 border border-neon-cyan/30 rounded hover:bg-neon-cyan/20 transition-colors"
          >
            Today
          </button>
        </div>

        <button
          onClick={handleNextMonth}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-neon-cyan/20 text-white/50 hover:text-neon-cyan transition-colors"
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

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] font-mono text-white/40 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const dayIsToday = isToday(day);
          const dayIsSelected = selectedDate && isSameDay(day, selectedDate);
          const dayIsCurrentMonth = isSameMonth(day, currentDate);
          const dayHasEvents = hasEvents(day);
          const eventCount = getEventCount(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate?.(day)}
              className={cn(
                "relative aspect-square flex flex-col items-center justify-center rounded text-xs font-mono transition-all",
                // Base styles
                dayIsCurrentMonth ? "text-white" : "text-white/20",
                // Today highlight
                dayIsToday && !dayIsSelected && "text-neon-cyan",
                // Selected state
                dayIsSelected &&
                  "bg-neon-cyan/30 border border-neon-cyan/50 text-neon-cyan",
                // Hover state
                !dayIsSelected &&
                  "hover:bg-white/5 hover:border hover:border-white/10",
                // Today ring
                dayIsToday && !dayIsSelected && "ring-1 ring-neon-cyan/30"
              )}
            >
              <span>{format(day, "d")}</span>

              {/* Event indicator dots */}
              {dayHasEvents && (
                <div className="absolute bottom-0.5 flex gap-0.5">
                  {eventCount <= 3 ? (
                    Array.from({ length: eventCount }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-1 h-1 rounded-full",
                          dayIsSelected ? "bg-neon-cyan" : "bg-neon-purple"
                        )}
                      />
                    ))
                  ) : (
                    <div
                      className={cn(
                        "text-[8px] px-1",
                        dayIsSelected ? "text-neon-cyan" : "text-neon-purple"
                      )}
                    >
                      {eventCount}
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer - Selected date info */}
      {selectedDate && (
        <div className="mt-3 pt-2 border-t border-white/10">
          <div className="text-[10px] font-mono text-white/50 uppercase">
            Selected
          </div>
          <div className="text-sm font-mono text-neon-cyan">
            {format(selectedDate, "EEEE, MMM d")}
          </div>
          {getEventCount(selectedDate) > 0 && (
            <div className="text-[10px] font-mono text-neon-purple mt-0.5">
              {getEventCount(selectedDate)} event
              {getEventCount(selectedDate) > 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MiniCalendar;
