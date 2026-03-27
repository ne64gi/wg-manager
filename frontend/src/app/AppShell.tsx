import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../core/auth/AuthContext";
import { AppLayout, type AppNavItem } from "../design/ui/AppLayout";
import {
  DashboardIcon,
  GroupIcon,
  LogsIcon,
  PeerIcon,
  SettingsIcon,
  UserIcon,
} from "../ui/Icons";

const appNavItems: Array<Omit<AppNavItem, "isActive" | "onSelect">> = [
  { to: "/", labelKey: "nav.dashboard", label: "Dashboard", icon: DashboardIcon },
  { to: "/groups", labelKey: "nav.groups", label: "Groups", icon: GroupIcon },
  { to: "/users", labelKey: "nav.users", label: "Users", icon: UserIcon },
  { to: "/peers", labelKey: "nav.peers", label: "Peers", icon: PeerIcon },
  { to: "/settings", labelKey: "nav.settings", label: "Settings", icon: SettingsIcon },
  { to: "/logs", labelKey: "nav.logs", label: "Logs", icon: LogsIcon },
];

function isNavItemActive(currentPathname: string, itemPath: string): boolean {
  if (itemPath === "/") {
    return currentPathname === "/";
  }

  return currentPathname === itemPath || currentPathname.startsWith(`${itemPath}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navigation = appNavItems.map((item) => ({
    ...item,
    isActive: isNavItemActive(location.pathname, item.to),
    onSelect: () => navigate(item.to),
  }));

  return (
    <AppLayout
      currentUsername={auth.currentUser?.username ?? null}
      navigation={navigation}
      onLogout={() => auth.logoutAction()}
    >
      {children}
    </AppLayout>
  );
}
