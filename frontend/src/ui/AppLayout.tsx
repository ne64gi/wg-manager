import { NavLink } from "react-router-dom";
import type { PropsWithChildren } from "react";

import { useAuth } from "../modules/auth/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/peers", label: "Peers" },
  { to: "/groups", label: "Groups" },
  { to: "/users", label: "Users" },
  { to: "/settings", label: "Settings" },
  { to: "/logs", label: "Logs" },
];

export function AppLayout({ children }: PropsWithChildren) {
  const auth = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
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
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-user">{auth.currentUser?.username}</div>
          <button className="secondary-button" onClick={() => auth.logoutAction()}>
            Log out
          </button>
        </div>
      </aside>
      <main className="content-shell">{children}</main>
    </div>
  );
}
