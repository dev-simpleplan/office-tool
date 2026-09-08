import { useState } from "react";
import { DatePicker } from "./DatePicker";

export interface DateRange {
  start: string; // ISO date (yyyy-mm-dd)
  end: string;
}

export type DateRangePreset = "today" | "this_week" | "last_week" | "this_month" | "last_month" | "custom";

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function computePresetRange(preset: Exclude<DateRangePreset, "custom">, now = new Date()): DateRange {
  if (preset === "today") {
    const d = toDateInput(now);
    return { start: d, end: d };
  }
  if (preset === "this_week") {
    const start = startOfWeek(now);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start: toDateInput(start), end: toDateInput(end) };
  }
  if (preset === "last_week") {
    const start = startOfWeek(now);
    start.setDate(start.getDate() - 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start: toDateInput(start), end: toDateInput(end) };
  }
  if (preset === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: toDateInput(start), end: toDateInput(end) };
  }
  // last_month
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return { start: toDateInput(start), end: toDateInput(end) };
}

const PRESET_LABELS: { key: Exclude<DateRangePreset, "custom">; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "this_week", label: "This Week" },
  { key: "last_week", label: "Last Week" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
];

export interface DateRangePickerProps {
  value: DateRange;
  preset: DateRangePreset;
  onChange: (range: DateRange, preset: DateRangePreset) => void;
}

export function DateRangePicker({ value, preset, onChange }: DateRangePickerProps) {
  const [customOpen, setCustomOpen] = useState(preset === "custom");

  function selectPreset(key: Exclude<DateRangePreset, "custom">) {
    setCustomOpen(false);
    onChange(computePresetRange(key), key);
  }

  function selectCustom() {
    setCustomOpen(true);
    onChange(value, "custom");
  }

  return (
    <div className="op-date-range-picker">
      <div className="op-date-range-picker__presets">
        {PRESET_LABELS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`op-date-range-picker__preset ${preset === p.key ? "op-date-range-picker__preset--active" : ""}`}
            onClick={() => selectPreset(p.key)}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          className={`op-date-range-picker__preset ${preset === "custom" ? "op-date-range-picker__preset--active" : ""}`}
          onClick={selectCustom}
        >
          Custom Range
        </button>
      </div>
      {customOpen && (
        <div className="op-date-range-picker__custom">
          <DatePicker
            value={value.start}
            max={value.end}
            onChange={(start) => onChange({ ...value, start }, "custom")}
          />
          <span className="text-text-muted">to</span>
          <DatePicker
            value={value.end}
            min={value.start}
            onChange={(end) => onChange({ ...value, end }, "custom")}
          />
        </div>
      )}
    </div>
  );
}
