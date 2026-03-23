import { useAuth } from "./modules/auth/AuthContext";
import { useApplyDocumentPreferences } from "./modules/preferences/useApplyDocumentPreferences";
import { useGuiSettingsQuery } from "./modules/gui/useGuiSettingsQuery";
import { ToastProvider } from "./ui/ToastProvider";
import { AppRoutes } from "./app/AppRoutes";

export default function App() {
  const auth = useAuth();
  const guiSettingsQuery = useGuiSettingsQuery();

  useApplyDocumentPreferences({
    isAuthenticated: auth.isAuthenticated,
    themeMode: guiSettingsQuery.data?.theme_mode,
    defaultLocale: guiSettingsQuery.data?.default_locale,
  });

  return (
    <ToastProvider>
      <AppRoutes />
    </ToastProvider>
  );
}
