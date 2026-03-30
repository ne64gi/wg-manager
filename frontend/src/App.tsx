import { useAuth } from "./core/auth/AuthContext";
import { useApplyDocumentPreferences } from "./core/preferences/useApplyDocumentPreferences";
import { useGuiSettingsQuery } from "./modules/gui/useGuiSettingsQuery";
import { ToastProvider } from "./design/ui/ToastProvider";
import { AppRoutes } from "./app/AppRoutes";

export default function App() {
  const auth = useAuth();
  const guiSettingsQuery = useGuiSettingsQuery();

  useApplyDocumentPreferences({
    isAuthenticated: auth.isAuthenticated,
    themeMode: auth.currentUser?.preferred_theme_mode ?? guiSettingsQuery.data?.theme_mode,
    defaultLocale: auth.currentUser?.locale ?? guiSettingsQuery.data?.default_locale,
  });

  return (
    <ToastProvider>
      <AppRoutes />
    </ToastProvider>
  );
}
