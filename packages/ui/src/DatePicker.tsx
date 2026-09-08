import { useEffect, useRef, useState } from "react";

export interface DatePickerProps {
  value: string; // ISO date (yyyy-mm-dd) or ""
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function parseISO(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplay(s: string): string {
  const d = parseISO(s);
  if (!d) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function DatePicker({ value, onChange, min, max, placeholder, disabled, id }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseISO(value);
  const [viewMonth, setViewMonth] = useState(() => selected ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) setViewMonth(selected);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const minDate = min ? parseISO(min) : null;
  const maxDate = max ? parseISO(max) : null;

  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1)),
  ];

  function isDisabled(d: Date) {
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  }

  function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  return (
    <div className="op-datepicker" ref={containerRef}>
      <button
        id={id}
        type="button"
        className="op-input op-datepicker__trigger"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
      >
        <span className={value ? "" : "op-datepicker__placeholder"}>
          {value ? formatDisplay(value) : (placeholder ?? "Select date...")}
        </span>
      </button>
      {open && (
        <div className="op-datepicker__popover">
          <div className="op-datepicker__header">
            <button
              type="button"
              className="op-datepicker__nav"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
              aria-label="Previous month"
            >
              &lsaquo;
            </button>
            <span className="op-datepicker__month-label">
              {viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>
            <button
              type="button"
              className="op-datepicker__nav"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
              aria-label="Next month"
            >
              &rsaquo;
            </button>
          </div>
          <div className="op-datepicker__weekdays">
            {WEEKDAYS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div className="op-datepicker__grid">
            {cells.map((d, i) =>
              d ? (
                <button
                  key={i}
                  type="button"
                  disabled={isDisabled(d)}
                  className={`op-datepicker__day ${selected && isSameDay(d, selected) ? "op-datepicker__day--selected" : ""} ${isSameDay(d, new Date()) ? "op-datepicker__day--today" : ""}`}
                  onClick={() => {
                    onChange(toISO(d));
                    setOpen(false);
                  }}
                >
                  {d.getDate()}
                </button>
              ) : (
                <span key={i} />
              ),
            )}
          </div>
          {value && (
            <button
              type="button"
              className="op-datepicker__clear"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
