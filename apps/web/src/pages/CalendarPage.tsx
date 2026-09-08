import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Badge } from "@office/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../lib/api";
import type { CalendarEvent } from "@office/shared";

function eventPath(e: CalendarEvent): string {
  return e.type === "TASK_DUE" ? `/tasks/${e.refId}` : `/projects/${e.refId}`;
}

type ViewMode = "day" | "week" | "month";

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function rangeFor(mode: ViewMode, anchor: Date): { start: Date; end: Date } {
  if (mode === "day") {
    const start = new Date(anchor);
    start.setHours(0, 0, 0, 0);
    const end = new Date(anchor);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (mode === "week") {
    const start = startOfWeek(anchor);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function shiftAnchor(mode: ViewMode, anchor: Date, dir: 1 | -1): Date {
  const next = new Date(anchor);
  if (mode === "day") next.setDate(next.getDate() + dir);
  else if (mode === "week") next.setDate(next.getDate() + 7 * dir);
  else next.setMonth(next.getMonth() + dir);
  return next;
}

function eventBadgeVariant(e: CalendarEvent) {
  if (e.type === "PROJECT_START") return "info" as const;
  if (e.type === "PROJECT_END") return "success" as const;
  if (e.status === "COMPLETED") return "success" as const;
  if (e.status === "BLOCKED") return "danger" as const;
  return "default" as const;
}

function DayCell({ date, events, muted }: { date: Date; events: CalendarEvent[]; muted?: boolean }) {
  const navigate = useNavigate();
  const isToday = new Date().toDateString() === date.toDateString();
  return (
    <div className={`min-h-[100px] rounded-md border border-border p-2 ${muted ? "opacity-40" : ""} ${isToday ? "ring-1 ring-primary" : ""}`}>
      <div className="mb-1 text-xs font-medium text-text-muted">{date.getDate()}</div>
      <div className="space-y-1">
        {events.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => navigate(eventPath(e))}
            className="block w-full truncate text-left"
          >
            <Badge variant={eventBadgeVariant(e)}>{e.title}</Badge>
          </button>
        ))}
      </div>
    </div>
  );
}

export function CalendarPage() {
  const [mode, setMode] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(new Date());
  const { start, end } = rangeFor(mode, anchor);

  const { data } = useQuery({
    queryKey: ["calendar", mode, start.toISOString(), end.toISOString()],
    queryFn: () =>
      api.get<{ events: CalendarEvent[] }>(`/api/dashboard/calendar?start=${start.toISOString()}&end=${end.toISOString()}`),
  });
  const events = data?.events ?? [];

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = new Date(e.date).toDateString();
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return map;
  }, [events]);

  const days: Date[] = useMemo(() => {
    if (mode === "day") return [start];
    if (mode === "week") {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d;
      });
    }
    const monthStart = start;
    const gridStart = startOfWeek(monthStart);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [mode, start]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-md border border-border p-1">
            {(["day", "week", "month"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded px-3 py-1 text-sm capitalize ${mode === m ? "bg-primary text-primary-foreground" : "text-text-muted"}`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setAnchor(shiftAnchor(mode, anchor, -1))} className="rounded p-1 hover:bg-surface"><ChevronLeft size={18} /></button>
            <span className="min-w-[10rem] text-center text-sm text-text-muted">
              {mode === "month"
                ? anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
                : `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`}
            </span>
            <button onClick={() => setAnchor(shiftAnchor(mode, anchor, 1))} className="rounded p-1 hover:bg-surface"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      <div className={`grid gap-2 ${mode === "day" ? "grid-cols-1" : "grid-cols-7"}`}>
        {days.map((d) => (
          <DayCell
            key={d.toISOString()}
            date={d}
            events={eventsByDay.get(d.toDateString()) ?? []}
            muted={mode === "month" && d.getMonth() !== anchor.getMonth()}
          />
        ))}
      </div>
    </div>
  );
}
