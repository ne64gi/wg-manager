import { useState } from "react";
import { NavLink } from "react-router-dom";
import type { PropsWithChildren } from "react";

import { t } from "../lib/i18n";
import { useAuth } from "../modules/auth/AuthContext";

const navItems = [
  { to: "/", labelKey: "nav.dashboard", label: "Dashboard" },
  { to: "/groups", labelKey: "nav.groups", label: "Groups" },
  { to: "/users", labelKey: "nav.users", label: "Users" },
  { to: "/peers", labelKey: "nav.peers", label: "Peers" },
  { to: "/settings", labelKey: "nav.settings", label: "Settings" },
  { to: "/logs", labelKey: "nav.logs", label: "Logs" },
];

export function AppLayout({ children }: PropsWithChildren) {
  const auth = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  function closeMobileNav() {
    setIsMobileNavOpen(false);
  }

  return (
    <div className="app-shell">
      <header className="mobile-topbar">
        <button
          className="mobile-menu-button"
          onClick={() => setIsMobileNavOpen(true)}
          aria-label="Open navigation menu"
        >
          <span />
          <span />
          <span />
        </button>
        <div className="mobile-topbar-title">
          <span className="brand-badge brand-badge-compact">wg</span>
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
      <aside className={`sidebar${isMobileNavOpen ? " sidebar-mobile-open" : ""}`}>
        <div>
          <div className="brand">
            <span className="brand-badge">wg</span>
            <div>
              <div className="brand-title">wg-studio</div>
              <div className="brand-subtitle">WireGuard control plane</div>
            </div>
          </div>
          <nav className="nav-list">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `nav-item${isActive ? " nav-item-active" : ""}`
                }
                end={item.to === "/"}
                onClick={closeMobileNav}
              >
                {t(item.labelKey, item.label)}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-user">{auth.currentUser?.username}</div>
          <button
            className="secondary-button"
            onClick={() => {
              closeMobileNav();
              auth.logoutAction();
            }}
          >
            {t("auth.logout", "Log out")}
          </button>
        </div>
      </aside>
      <main className="content-shell">{children}</main>
    </div>
  );
}
