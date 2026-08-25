import { useState } from "react";

export interface MultiSelectOption {
  id: string;
  label: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  searchPlaceholder?: string;
}

export function MultiSelect({ options, selected, onChange, searchPlaceholder = "Search..." }: MultiSelectProps) {
  const [query, setQuery] = useState("");

  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <div className="rounded-md border border-border bg-surface">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={searchPlaceholder}
        className="w-full border-b border-border bg-transparent px-3 py-2 text-sm text-text outline-none placeholder:text-text-muted"
      />
      <div className="max-h-40 overflow-y-auto p-1">
        {filtered.length === 0 && (
          <p className="px-2 py-3 text-sm text-text-muted">No matches.</p>
        )}
        {filtered.map((o) => (
          <label
            key={o.id}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-text hover:bg-surface-hover"
          >
            <input
              type="checkbox"
              checked={selected.includes(o.id)}
              onChange={() => toggle(o.id)}
              className="h-4 w-4 accent-primary"
            />
            {o.label}
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <div className="border-t border-border px-3 py-1.5 text-xs text-text-muted">
          {selected.length} selected
        </div>
      )}
    </div>
  );
}
