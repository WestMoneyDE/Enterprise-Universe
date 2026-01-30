"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { NeonButton } from "@/components/scifi";
import {
  CalendarEvent,
  CalendarEventInput,
  CalendarEventType,
  LinkedEntityType,
  EVENT_TYPE_COLORS,
} from "@/hooks/use-calendar-events";

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT MODAL - Create/Edit calendar events with SciFi styling
// ═══════════════════════════════════════════════════════════════════════════════

interface EventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CalendarEvent | null;
  initialDate?: Date;
  onSave: (event: CalendarEventInput) => void;
  onDelete?: (id: string) => void;
}

const EVENT_TYPES: { value: CalendarEventType; label: string; icon: string }[] = [
  { value: "meeting", label: "Meeting", icon: "◉" },
  { value: "follow-up", label: "Follow-up", icon: "◈" },
  { value: "task", label: "Task", icon: "◇" },
  { value: "reminder", label: "Reminder", icon: "⚡" },
];

const LINKED_ENTITY_TYPES: { value: LinkedEntityType; label: string }[] = [
  { value: null, label: "None" },
  { value: "contact", label: "Contact" },
  { value: "deal", label: "Deal" },
];

// Mock linked entities for demo
const MOCK_CONTACTS = [
  { id: "contact-001", name: "Hans Mueller" },
  { id: "contact-002", name: "Anna Schmidt" },
  { id: "contact-003", name: "Peter Weber" },
];

const MOCK_DEALS = [
  { id: "deal-001", name: "Villa Projekt Munchen" },
  { id: "deal-002", name: "Smart Home Retrofit" },
  { id: "deal-003", name: "Gewerbebau Komplex" },
];

export function EventModal({
  open,
  onOpenChange,
  event,
  initialDate,
  onSave,
  onDelete,
}: EventModalProps) {
  const isEditing = !!event;

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [duration, setDuration] = useState(60); // minutes
  const [type, setType] = useState<CalendarEventType>("meeting");
  const [linkedEntityType, setLinkedEntityType] = useState<LinkedEntityType>(null);
  const [linkedEntityId, setLinkedEntityId] = useState<string | null>(null);

  // Reset form when modal opens/closes or event changes
  useEffect(() => {
    if (open) {
      if (event) {
        setTitle(event.title);
        setDescription(event.description);
        setDate(format(event.start, "yyyy-MM-dd"));
        setStartTime(format(event.start, "HH:mm"));
        const durationMs = event.end.getTime() - event.start.getTime();
        setDuration(Math.round(durationMs / (1000 * 60)));
        setType(event.type);
        setLinkedEntityType(event.linkedEntityType);
        setLinkedEntityId(event.linkedEntityId);
      } else {
        const initialOrToday = initialDate || new Date();
        setTitle("");
        setDescription("");
        setDate(format(initialOrToday, "yyyy-MM-dd"));
        setStartTime("09:00");
        setDuration(60);
        setType("meeting");
        setLinkedEntityType(null);
        setLinkedEntityId(null);
      }
    }
  }, [open, event, initialDate]);

  const handleSave = () => {
    const [year, month, day] = date.split("-").map(Number);
    const [hours, minutes] = startTime.split(":").map(Number);

    const start = new Date(year, month - 1, day, hours, minutes);
    const end = new Date(start.getTime() + duration * 60 * 1000);

    onSave({
      title,
      description,
      start,
      end,
      type,
      linkedEntityType,
      linkedEntityId,
    });

    onOpenChange(false);
  };

  const handleDelete = () => {
    if (event && onDelete) {
      onDelete(event.id);
      onOpenChange(false);
    }
  };

  const linkedEntities = linkedEntityType === "contact" ? MOCK_CONTACTS : MOCK_DEALS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="cyber" className="max-w-md">
        {/* Decorative corners */}
        <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-neon-cyan/50" />
        <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-neon-cyan/50" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-neon-cyan/50" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-neon-cyan/50" />

        <DialogHeader>
          <DialogTitle className="font-display text-lg tracking-wider text-white flex items-center gap-2">
            <span className="text-neon-cyan">
              {isEditing ? "EDIT" : "NEW"} EVENT
            </span>
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: EVENT_TYPE_COLORS[type] }}
            />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Title */}
          <div>
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider block mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title..."
              className="w-full px-3 py-2 bg-void-surface/50 border border-white/10 rounded-lg text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:border-neon-cyan/50 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider block mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Event description..."
              rows={2}
              className="w-full px-3 py-2 bg-void-surface/50 border border-white/10 rounded-lg text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:border-neon-cyan/50 transition-colors resize-none"
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider block mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-void-surface/50 border border-white/10 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-neon-cyan/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider block mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-void-surface/50 border border-white/10 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-neon-cyan/50 transition-colors"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider block mb-1">
              Duration
            </label>
            <div className="flex gap-2">
              {[15, 30, 60, 90, 120].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDuration(mins)}
                  className={cn(
                    "flex-1 px-2 py-1.5 rounded text-xs font-mono border transition-all",
                    duration === mins
                      ? "bg-neon-cyan/20 border-neon-cyan/50 text-neon-cyan"
                      : "bg-void-surface/30 border-white/10 text-white/50 hover:border-white/30"
                  )}
                >
                  {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                </button>
              ))}
            </div>
          </div>

          {/* Event Type */}
          <div>
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider block mb-1">
              Event Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              {EVENT_TYPES.map(({ value, label, icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
                    type === value
                      ? "border-opacity-50"
                      : "bg-void-surface/30 border-white/10 hover:border-white/30"
                  )}
                  style={{
                    backgroundColor:
                      type === value ? `${EVENT_TYPE_COLORS[value]}20` : undefined,
                    borderColor:
                      type === value ? `${EVENT_TYPE_COLORS[value]}80` : undefined,
                  }}
                >
                  <span
                    className="text-lg"
                    style={{ color: EVENT_TYPE_COLORS[value] }}
                  >
                    {icon}
                  </span>
                  <span
                    className="text-[10px] font-mono"
                    style={{
                      color: type === value ? EVENT_TYPE_COLORS[value] : "rgba(255,255,255,0.5)",
                    }}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Link to Entity */}
          <div>
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-wider block mb-1">
              Link to
            </label>
            <div className="flex gap-2 mb-2">
              {LINKED_ENTITY_TYPES.map(({ value, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setLinkedEntityType(value);
                    setLinkedEntityId(null);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded text-xs font-mono border transition-all",
                    linkedEntityType === value
                      ? "bg-neon-purple/20 border-neon-purple/50 text-neon-purple"
                      : "bg-void-surface/30 border-white/10 text-white/50 hover:border-white/30"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {linkedEntityType && (
              <select
                value={linkedEntityId || ""}
                onChange={(e) => setLinkedEntityId(e.target.value || null)}
                className="w-full px-3 py-2 bg-void-surface/50 border border-white/10 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-neon-cyan/50 transition-colors"
              >
                <option value="">Select {linkedEntityType}...</option>
                {linkedEntities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <DialogFooter className="mt-6 flex gap-2">
          {isEditing && onDelete && (
            <NeonButton
              variant="gold"
              size="sm"
              onClick={handleDelete}
              className="mr-auto"
            >
              Delete
            </NeonButton>
          )}
          <NeonButton
            variant="cyan"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </NeonButton>
          <NeonButton
            variant="purple"
            size="sm"
            glow
            onClick={handleSave}
            disabled={!title || !date}
          >
            {isEditing ? "Update" : "Create"}
          </NeonButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EventModal;
