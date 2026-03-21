import { useState, type ReactNode } from "react";

export function MobileInfoPopover({
  children,
  label = "Info",
}: {
  children: ReactNode;
  label?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`mobile-info${isOpen ? " mobile-info-open" : ""}`}>
      <button
        type="button"
        className="ghost-button mobile-info-trigger"
        onClick={() => setIsOpen((current) => !current)}
      >
        {label}
      </button>
      {isOpen ? (
        <div className="mobile-info-popover">
          <div className="mobile-info-body">{children}</div>
        </div>
      ) : null}
    </div>
  );
}
