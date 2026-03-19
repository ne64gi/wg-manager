import { useEffect } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import { useAuth } from "./modules/auth/AuthContext";
import { useGuiSettingsQuery } from "./modules/gui/useGuiSettingsQuery";
import { AppLayout } from "./ui/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { GroupsPage } from "./pages/GroupsPage";
import { LoginPage } from "./pages/LoginPage";
import { LogsPage } from "./pages/LogsPage";
import { PeersPage } from "./pages/PeersPage";
import { SettingsPage } from "./pages/SettingsPage";
import { UsersPage } from "./pages/UsersPage";

function ProtectedLayout() {
  const auth = useAuth();

  if (auth.isBootstrapping) {
    return <div className="screen-message">Loading session…</div>;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

export default function App() {
  const auth = useAuth();
  const guiSettingsQuery = useGuiSettingsQuery();

  useEffect(() => {
    document.documentElement.dataset.theme =
      guiSettingsQuery.data?.theme_mode ?? "system";
  }, [guiSettingsQuery.data?.theme_mode]);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          auth.isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
        }
      />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/peers" element={<PeersPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/logs" element={<LogsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
