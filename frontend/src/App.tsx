import { useEffect } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import { getPreviewTheme, getStoredPreviewLocale } from "./lib/i18n";
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
import { ToastProvider } from "./ui/ToastProvider";

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
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function applyGuiPreferences() {
      const previewTheme = getPreviewTheme();
      const previewLocale = getStoredPreviewLocale();
      const themeMode =
        previewTheme ??
        (auth.isAuthenticated
          ? (guiSettingsQuery.data?.theme_mode ?? "system")
          : "system");
      const locale =
        previewLocale ??
        (auth.isAuthenticated
          ? (guiSettingsQuery.data?.default_locale ?? "en")
          : "en");
      const resolvedTheme =
        themeMode === "system" ? (mediaQuery.matches ? "dark" : "light") : themeMode;

      document.documentElement.dataset.theme = resolvedTheme;
      document.documentElement.dataset.themeMode = themeMode;
      document.documentElement.lang = locale;
    }

    applyGuiPreferences();
    mediaQuery.addEventListener("change", applyGuiPreferences);
    return () => mediaQuery.removeEventListener("change", applyGuiPreferences);
  }, [auth.isAuthenticated, guiSettingsQuery.data?.default_locale, guiSettingsQuery.data?.theme_mode]);

  return (
    <ToastProvider>
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
    </ToastProvider>
  );
}
