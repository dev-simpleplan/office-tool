import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "@office/ui";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import type { SearchResultItem } from "@office/shared";

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  to: string;
  permission?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: "action-dashboard", title: "Go to Dashboard", subtitle: "Quick action", to: "/" },
  { id: "action-calendar", title: "Go to Calendar", subtitle: "Quick action", to: "/calendar" },
  { id: "action-create-task", title: "Create Task", subtitle: "Quick action", to: "/tasks", permission: "tasks.create" },
  { id: "action-create-project", title: "Create Project", subtitle: "Quick action", to: "/projects", permission: "projects.create" },
];

interface Row {
  id: string;
  title: string;
  subtitle: string;
  to: string;
  group: string;
}

const TYPE_TO_PATH: Record<SearchResultItem["type"], string> = {
  employee: "/employees",
  project: "/projects",
  task: "/tasks",
  team: "/teams",
  department: "/departments",
};

const TYPE_LABEL: Record<SearchResultItem["type"], string> = {
  employee: "Employees",
  project: "Projects",
  task: "Tasks",
  team: "Teams",
  department: "Departments",
};

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebounced("");
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { data } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => api.get<{ results: SearchResultItem[] }>(`/api/search?q=${encodeURIComponent(debounced)}`),
    enabled: open && debounced.trim().length > 0,
  });

  const quickActions = useMemo(
    () => QUICK_ACTIONS.filter((a) => !a.permission || user?.permissions.includes(a.permission)),
    [user]
  );

  const rows: Row[] = useMemo(() => {
    if (!debounced.trim()) {
      return quickActions.map((a) => ({ id: a.id, title: a.title, subtitle: a.subtitle, to: a.to, group: "Quick Actions" }));
    }
    const results = data?.results ?? [];
    return results.map((r) => ({
      id: `${r.type}-${r.id}`,
      title: r.title,
      subtitle: r.subtitle,
      to: `${TYPE_TO_PATH[r.type]}/${r.id}`,
      group: TYPE_LABEL[r.type],
    }));
  }, [debounced, data, quickActions]);

  function go(row: Row) {
    onClose();
    navigate(row.to);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (rows[activeIndex]) go(rows[activeIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  let groupedIndex = -1;
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    if (!groups.has(row.group)) groups.set(row.group, []);
    groups.get(row.group)!.push(row);
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div onKeyDown={onKeyDown}>
        <input
          autoFocus
          className="op-input mb-3"
          placeholder="Search employees, projects, tasks, teams, departments..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
        />
        <div className="max-h-96 overflow-y-auto">
          {rows.length === 0 && <p className="px-2 py-4 text-sm text-text-muted">No results.</p>}
          {[...groups.entries()].map(([group, groupRows]) => (
            <div key={group} className="mb-2">
              <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-text-muted">{group}</div>
              {groupRows.map((row) => {
                groupedIndex += 1;
                const isActive = groupedIndex === activeIndex;
                return (
                  <button
                    key={row.id}
                    onClick={() => go(row)}
                    onMouseEnter={() => setActiveIndex(groupedIndex)}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm ${
                      isActive ? "bg-primary text-primary-foreground" : "text-text hover:bg-background"
                    }`}
                  >
                    <span>{row.title}</span>
                    <span className={isActive ? "text-primary-foreground/80" : "text-text-muted"}>{row.subtitle}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
