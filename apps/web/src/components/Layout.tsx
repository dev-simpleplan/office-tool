import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, LogOut, Moon, Sun, Monitor } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useUiStore } from "../store/uiStore";
import { api } from "../lib/api";
import { useQueryClient } from "@tanstack/react-query";

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleLogout() {
    await api.post("/api/auth/logout");
    queryClient.setQueryData(["me"], { user: null });
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen bg-background text-text">
      <aside className="w-60 shrink-0 border-r border-border bg-surface p-4 flex flex-col gap-2">
        <div className="text-lg font-bold text-primary mb-6 px-2">SimplePlan Office</div>
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${isActive ? "bg-primary text-primary-foreground" : "text-text hover:bg-background"}`
          }
        >
          <LayoutDashboard size={18} /> Dashboard
        </NavLink>
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
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
          <div className="text-sm text-text-muted">
            {user ? `${user.email} · ${user.roleName}` : ""}
          </div>
          <div className="flex items-center gap-3">
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
    </div>
  );
}
