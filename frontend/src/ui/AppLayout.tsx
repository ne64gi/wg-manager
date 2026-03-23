import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import type { PropsWithChildren } from "react";

import { readLocalStorage, writeLocalStorage } from "../lib/browser/storage";
import { t } from "../lib/i18n";
import { useAuth } from "../modules/auth/AuthContext";
import {
  BrandIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DashboardIcon,
  GroupIcon,
  LogoutIcon,
  LogsIcon,
  MenuIcon,
  PeerIcon,
  SettingsIcon,
  UserIcon,
} from "./Icons";

const navItems = [
  { to: "/", labelKey: "nav.dashboard", label: "Dashboard", icon: DashboardIcon },
  { to: "/groups", labelKey: "nav.groups", label: "Groups", icon: GroupIcon },
  { to: "/users", labelKey: "nav.users", label: "Users", icon: UserIcon },
  { to: "/peers", labelKey: "nav.peers", label: "Peers", icon: PeerIcon },
  { to: "/settings", labelKey: "nav.settings", label: "Settings", icon: SettingsIcon },
  { to: "/logs", labelKey: "nav.logs", label: "Logs", icon: LogsIcon },
];

export function AppLayout({ children }: PropsWithChildren) {
  const auth = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isDesktopNavCollapsed, setIsDesktopNavCollapsed] = useState(() => {
    return readLocalStorage("wg-studio.desktop-nav-collapsed") === "true";
  });

  useEffect(() => {
    writeLocalStorage("wg-studio.desktop-nav-collapsed", String(isDesktopNavCollapsed));
  }, [isDesktopNavCollapsed]);

  function closeMobileNav() {
    setIsMobileNavOpen(false);
  }

  return (
    <div
      className={`app-shell${isDesktopNavCollapsed ? " app-shell-sidebar-collapsed" : ""}`}
      data-testid="app-shell"
    >
      <header className="mobile-topbar">
        <button
          className="mobile-menu-button"
          onClick={() => setIsMobileNavOpen(true)}
          aria-label="Open navigation menu"
        >
          <MenuIcon className="icon icon-menu" />
        </button>
        <div className="mobile-topbar-title">
          <span className="brand-badge brand-badge-logo brand-badge-compact">
            <BrandIcon className="brand-icon" />
          </span>
          <span>wg-studio</span>
        </div>
      </header>
      {isMobileNavOpen ? (
        <button
          className="mobile-nav-backdrop"
          aria-label="Close navigation menu"
          onClick={closeMobileNav}
        />
      ) : null}
      <aside
        className={`sidebar${isMobileNavOpen ? " sidebar-mobile-open" : ""}${
          isDesktopNavCollapsed ? " sidebar-desktop-collapsed" : ""
        }`}
      >
        <div>
          <div className="sidebar-brand-row">
            <div className="brand">
              <span className="brand-badge brand-badge-logo">
                <BrandIcon className="brand-icon" />
              </span>
              <div className={isDesktopNavCollapsed ? "sidebar-collapsed-hidden" : ""}>
                <div className="brand-title">wg-studio</div>
                <div className="brand-subtitle">WireGuard control plane</div>
              </div>
            </div>
            <button
              className="sidebar-toggle-button"
              type="button"
              data-testid="sidebar-toggle"
              aria-label={isDesktopNavCollapsed ? "Expand navigation" : "Collapse navigation"}
              onClick={() => setIsDesktopNavCollapsed((current) => !current)}
            >
              {isDesktopNavCollapsed ? (
                <ChevronRightIcon className="icon" />
              ) : (
                <ChevronLeftIcon className="icon" />
              )}
            </button>
          </div>
          <nav className="nav-list">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `nav-item${isActive ? " nav-item-active" : ""}`
                }
                end={item.to === "/"}
                onClick={closeMobileNav}
                title={isDesktopNavCollapsed ? t(item.labelKey, item.label) : undefined}
              >
                <item.icon className="icon nav-icon" />
                <span className={isDesktopNavCollapsed ? "sidebar-collapsed-hidden" : ""}>
                  {t(item.labelKey, item.label)}
                </span>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="sidebar-footer">
          <div className={`sidebar-user${isDesktopNavCollapsed ? " sidebar-collapsed-hidden" : ""}`}>
            {auth.currentUser?.username}
          </div>
          <button
            className={`secondary-button sidebar-logout-button${
              isDesktopNavCollapsed ? " sidebar-logout-button-collapsed" : ""
            }`}
            data-testid="nav-logout"
            onClick={() => {
              closeMobileNav();
              auth.logoutAction();
            }}
            title={isDesktopNavCollapsed ? t("auth.logout", "Log out") : undefined}
          >
            <LogoutIcon className="icon" />
            <span className={isDesktopNavCollapsed ? "sidebar-collapsed-hidden" : ""}>
              {t("auth.logout", "Log out")}
            </span>
          </button>
        </div>
      </aside>
      <main className="content-shell">{children}</main>
    </div>
  );
}
