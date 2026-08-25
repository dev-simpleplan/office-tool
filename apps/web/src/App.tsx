import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { EmployeeDetailPage } from "./pages/EmployeeDetailPage";
import { DepartmentsPage } from "./pages/DepartmentsPage";
import { TeamsPage } from "./pages/TeamsPage";
import { SchedulesPage } from "./pages/SchedulesPage";
import { useCurrentUser } from "./lib/useCurrentUser";

function ProtectedRoutes() {
  const { data, isLoading } = useCurrentUser();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-text-muted">Loading...</div>;
  }
  if (!data?.user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoutes />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/employees/:id" element={<EmployeeDetailPage />} />
        <Route path="/departments" element={<DepartmentsPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/schedules" element={<SchedulesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
