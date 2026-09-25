import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { isLeadRole } from "@office/shared";
import { LayoutDashboard, Users, LogOut, Moon, Sun, Monitor, Building2, UsersRound, CalendarClock, UserCircle, FolderKanban, ListChecks, CalendarDays, Gauge, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { useUiStore } from "../store/uiStore";
import { api } from "../lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { NotificationBell } from "./NotificationBell";
import { CommandPalette } from "./CommandPalette";

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function handleLogout() {
    await api.post("/api/auth/logout");
    queryClient.setQueryData(["me"], { user: null });
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen bg-background text-text">
      <aside className="w-60 shrink-0 border-r border-border bg-surface p-4 flex flex-col gap-2">
        <div className="text-lg font-bold text-primary mb-6 px-2 lowercase tracking-tight">
          simpleplan office
        </div>
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-primary text-primary-foreground" : "text-text hover:bg-background"}`
          }
        >
          <LayoutDashboard size={18} /> Dashboard
        </NavLink>
        {user?.permissions.includes("reports.view") && (
          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-primary text-primary-foreground" : "text-text hover:bg-background"}`
            }
          >
            <BarChart3 size={18} /> Reports
          </NavLink>
        )}
        <NavLink
          to="/calendar"
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-primary text-primary-foreground" : "text-text hover:bg-background"}`
          }
        >
          <CalendarDays size={18} /> Calendar
        </NavLink>
        {isLeadRole(user?.roleName) && (
          <NavLink
            to="/team/workload"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-primary text-primary-foreground" : "text-text hover:bg-background"}`
            }
          >
            <Gauge size={18} /> Team Workload
          </NavLink>
        )}
        {user?.employeeId && (
          <NavLink
            to={`/employees/${user.employeeId}`}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-primary text-primary-foreground" : "text-text hover:bg-background"}`
            }
          >
            <UserCircle size={18} /> My Profile
          </NavLink>
        )}
        {(user?.permissions.includes("employees.view") ||
          user?.permissions.includes("departments.view") ||
          user?.permissions.includes("teams.view") ||
          user?.permissions.includes("schedules.view")) && (
          <div className="mt-4 px-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            People
          </div>
        )}
        {user?.permissions.includes("employees.view") && (
          <NavLink
            to="/employees"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-primary text-primary-foreground" : "text-text hover:bg-background"}`
            }
          >
            <Users size={18} /> Employees
          </NavLink>
        )}
        {user?.permissions.includes("teams.view") && (
          <NavLink
            to="/teams"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-primary text-primary-foreground" : "text-text hover:bg-background"}`
            }
          >
            <UsersRound size={18} /> Teams
          </NavLink>
        )}
        {user?.permissions.includes("departments.view") && (
          <NavLink
            to="/departments"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-primary text-primary-foreground" : "text-text hover:bg-background"}`
            }
          >
            <Building2 size={18} /> Departments
          </NavLink>
        )}
        {user?.permissions.includes("schedules.view") && (
          <NavLink
            to="/schedules"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-primary text-primary-foreground" : "text-text hover:bg-background"}`
            }
          >
            <CalendarClock size={18} /> Schedules
          </NavLink>
        )}
        {(user?.permissions.includes("projects.view") || user?.permissions.includes("tasks.view")) && (
          <div className="mt-4 px-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Work
          </div>
        )}
        {user?.permissions.includes("projects.view") && (
          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-primary text-primary-foreground" : "text-text hover:bg-background"}`
            }
          >
            <FolderKanban size={18} /> Projects
          </NavLink>
        )}
        {user?.permissions.includes("tasks.view") && (
          <NavLink
            to="/tasks"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-primary text-primary-foreground" : "text-text hover:bg-background"}`
            }
          >
            <ListChecks size={18} /> Tasks
          </NavLink>
        )}
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
          <div className="text-sm text-text-muted">
            {user ? `${user.email} · ${user.roleName.replace("_", " ")}` : ""}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:text-text sm:flex"
            >
              Search... <kbd className="rounded border border-border px-1 font-sans">Ctrl+K</kbd>
            </button>
            <NotificationBell />
            <div className="flex items-center gap-1 rounded-md border border-border p-1">
              {(["light", "system", "dark"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`rounded p-1 ${theme === t ? "bg-primary text-primary-foreground" : "text-text-muted"}`}
                  aria-label={t}
                >
                  {t === "light" && <Sun size={14} />}
                  {t === "dark" && <Moon size={14} />}
                  {t === "system" && <Monitor size={14} />}
                </button>
              ))}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-sm text-text-muted hover:text-danger"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>
        <main className="flex-1 min-w-0 p-6">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
