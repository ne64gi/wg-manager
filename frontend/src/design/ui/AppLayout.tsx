import { useEffect, useRef, useState } from "react";
import type { ComponentType, PropsWithChildren } from "react";

import { readLocalStorage, writeLocalStorage } from "../../lib/browser/storage";
import { t } from "../../lib/i18n";
import {
  BrandIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LogoutIcon,
  MenuIcon,
} from "../../ui/Icons";

export type AppNavItem = {
  to: string;
  labelKey: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  isActive: boolean;
  onSelect: () => void;
};

export function AppLayout({
  children,
  currentUsername,
  navigation,
  onLogout,
  onEditProfile,
}: PropsWithChildren<{
  currentUsername: string | null;
  navigation: AppNavItem[];
  onLogout: () => Promise<void> | void;
  onEditProfile?: () => void;
}>) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isDesktopNavCollapsed, setIsDesktopNavCollapsed] = useState(() => {
    return readLocalStorage("wg-studio.desktop-nav-collapsed") === "true";
  });
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    writeLocalStorage("wg-studio.desktop-nav-collapsed", String(isDesktopNavCollapsed));
  }, [isDesktopNavCollapsed]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

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
          type="button"
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
          type="button"
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
            {navigation.map((item) => (
              <button
                key={item.to}
                type="button"
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`nav-item${item.isActive ? " nav-item-active" : ""}`}
                onClick={() => {
                  closeMobileNav();
                  setIsUserMenuOpen(false);
                  item.onSelect();
                }}
                title={isDesktopNavCollapsed ? t(item.labelKey, item.label) : undefined}
              >
                <item.icon className="icon nav-icon" />
                <span className={isDesktopNavCollapsed ? "sidebar-collapsed-hidden" : ""}>
                  {t(item.labelKey, item.label)}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div
            ref={userMenuRef}
            className={`sidebar-user-menu${isDesktopNavCollapsed ? " sidebar-user-menu-collapsed" : ""}`}
          >
            <button
              type="button"
              className={`secondary-button sidebar-user-trigger${
                isDesktopNavCollapsed ? " sidebar-user-trigger-collapsed" : ""
              }`}
              data-testid="sidebar-user-trigger"
              onClick={() => setIsUserMenuOpen((current) => !current)}
              title={isDesktopNavCollapsed ? currentUsername ?? "-" : undefined}
            >
              <span className="sidebar-user-trigger-icon">👤</span>
              <span className={isDesktopNavCollapsed ? "sidebar-collapsed-hidden" : ""}>
                {currentUsername ?? "-"}
              </span>
            </button>

            {isUserMenuOpen ? (
              <div
                className={`sidebar-user-popover${
                  isDesktopNavCollapsed ? " sidebar-user-popover-collapsed" : ""
                }`}
              >
                <div className="sidebar-user-popover-main">
                  <div className="sidebar-user-popover-name">{currentUsername ?? "-"}</div>
                  <div className="sidebar-user-popover-email">mailaddress（未実装）</div>
                </div>

                <div className="sidebar-user-popover-separator" />

                <div className="sidebar-user-popover-actions">
                  <button
                    type="button"
                    className="ghost-button sidebar-user-popover-action"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onEditProfile?.();
                    }}
                  >
                    {t("common.edit", "編集")}
                  </button>

                  <button
                    type="button"
                    className="ghost-button sidebar-user-popover-action sidebar-user-popover-action-danger"
                    data-testid="nav-logout"
                    onClick={async () => {
                      setIsUserMenuOpen(false);
                      closeMobileNav();
                      await onLogout();
                    }}
                  >
                    {t("auth.logout", "ログアウト")}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <main className="content-shell">{children}</main>
    </div>
  );
}
