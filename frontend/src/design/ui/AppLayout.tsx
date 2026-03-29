import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ComponentType, CSSProperties, PropsWithChildren } from "react";
import { createPortal } from "react-dom";

import { readLocalStorage, writeLocalStorage } from "../../core/browser/storage";
import { t } from "../../core/i18n";
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
  const userTriggerRef = useRef<HTMLButtonElement | null>(null);
  const userPopoverRef = useRef<HTMLDivElement | null>(null);
  const [userPopoverStyle, setUserPopoverStyle] = useState<CSSProperties | null>(null);

  useEffect(() => {
    writeLocalStorage("wg-studio.desktop-nav-collapsed", String(isDesktopNavCollapsed));
  }, [isDesktopNavCollapsed]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        userMenuRef.current?.contains(target) ||
        userPopoverRef.current?.contains(target)
      ) {
        return;
      }
      if (isUserMenuOpen) {
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
  }, [isUserMenuOpen]);

  useLayoutEffect(() => {
    if (!isUserMenuOpen || !userTriggerRef.current) {
      return;
    }

    function updateUserPopoverPosition() {
      const triggerRect = userTriggerRef.current?.getBoundingClientRect();
      if (!triggerRect) {
        return;
      }

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const gap = 12;
      const popoverWidth = Math.min(260, viewportWidth - 32);
      let left = isDesktopNavCollapsed
        ? triggerRect.right + gap
        : triggerRect.left;

      if (left + popoverWidth > viewportWidth - 16) {
        left = viewportWidth - popoverWidth - 16;
      }
      if (left < 16) {
        left = 16;
      }

      const estimatedHeight = userPopoverRef.current?.offsetHeight ?? 190;
      let top = triggerRect.top - estimatedHeight - gap;

      if (top < 16) {
        top = Math.min(triggerRect.bottom + gap, viewportHeight - estimatedHeight - 16);
      }
      if (top < 16) {
        top = 16;
      }

      setUserPopoverStyle({
        position: "fixed",
        top,
        left,
        width: popoverWidth,
        bottom: "auto",
        transform: "none",
        zIndex: 4000,
      });
    }

    updateUserPopoverPosition();
    window.addEventListener("resize", updateUserPopoverPosition);
    window.addEventListener("scroll", updateUserPopoverPosition, true);

    return () => {
      window.removeEventListener("resize", updateUserPopoverPosition);
      window.removeEventListener("scroll", updateUserPopoverPosition, true);
    };
  }, [isDesktopNavCollapsed, isUserMenuOpen]);

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
        <div className="sidebar-main">
          <div className="sidebar-brand-row">
            <div className="brand">
              <span className="brand-badge brand-badge-logo">
                <BrandIcon className="brand-icon" />
              </span>
              <div className={isDesktopNavCollapsed ? "sidebar-collapsed-hidden" : ""}>
                <div className="brand-title">wg-studio</div>
                <div className="brand-subtitle">Management console</div>
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
              ref={userTriggerRef}
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

          </div>
        </div>
      </aside>

      <main className="content-shell">{children}</main>

      {isUserMenuOpen && userPopoverStyle
        ? createPortal(
            <div
              ref={userPopoverRef}
              className="sidebar-user-popover"
              style={userPopoverStyle}
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
                  {t("common.edit", "Edit")}
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
                  {t("auth.logout", "Logout")}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
