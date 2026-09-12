import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { AppLayout } from "./layouts/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { TasksPage } from "./pages/TasksPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { UsersPage } from "./pages/UsersPage";
import { ClientsPage } from "./pages/ClientsPage";

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15000 } } });

export function App(): JSX.Element {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/projects" element={<ProtectedRoute roles={["ADMIN", "PROJECT_MANAGER"]}><ProjectsPage /></ProtectedRoute>} />
              <Route path="/projects/:id" element={<ProtectedRoute roles={["ADMIN", "PROJECT_MANAGER"]}><ProjectDetailPage /></ProtectedRoute>} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/admin/users" element={<ProtectedRoute roles={["ADMIN"]}><UsersPage /></ProtectedRoute>} />
              <Route path="/admin/clients" element={<ProtectedRoute roles={["ADMIN"]}><ClientsPage /></ProtectedRoute>} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
