import type { ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";

import { DashboardPage } from "../pages/DashboardPage";
import { GroupsPage } from "../pages/GroupsPage";
import { LoginPage } from "../pages/LoginPage";
import { LogsPage } from "../pages/LogsPage";
import { NetworkPage } from "../pages/NetworkPage";
import { PeersPage } from "../pages/PeersPage";
import { ProfilePage } from "../pages/ProfilePage";
import { SettingsPage } from "../pages/SettingsPage";
import { UsersPage } from "../pages/UsersPage";
import { useAuth } from "../core/auth/AuthContext";
import { AppShell } from "./AppShell";

function ProtectedLayout() {
  const auth = useAuth();

  if (auth.isBootstrapping) {
    return <div className="screen-message">Loading session…</div>;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function AdminOnlyRoute({ children }: { children: ReactNode }) {
  const auth = useAuth();

  if (auth.currentUser?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function LoginRoute() {
  const auth = useAuth();
  const navigate = useNavigate();

  if (auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <LoginPage onAuthenticated={() => navigate("/", { replace: true })} />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/peers" element={<PeersPage />} />
        <Route path="/network" element={<NetworkPage />} />
        <Route
          path="/groups"
          element={
            <AdminOnlyRoute>
              <GroupsPage />
            </AdminOnlyRoute>
          }
        />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route
          path="/logs"
          element={
            <AdminOnlyRoute>
              <LogsPage />
            </AdminOnlyRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
