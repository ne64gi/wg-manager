import { useState } from "react";
import { NavLink } from "react-router-dom";
import type { PropsWithChildren } from "react";

import { useAuth } from "../modules/auth/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/groups", label: "Groups" },
  { to: "/users", label: "Users" },
  { to: "/peers", label: "Peers" },
  { to: "/settings", label: "Settings" },
  { to: "/logs", label: "Logs" },
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
        <div className="mobile-topbar-title">wg-studio</div>
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
          <div className="brand">wg-studio</div>
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
                {item.label}
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
            Log out
          </button>
        </div>
      </aside>
      <main className="content-shell">{children}</main>
    </div>
  );
}
