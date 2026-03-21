import type { ImgHTMLAttributes, ReactNode, SVGProps } from "react";
import wireguardLogo from "./wireguard-logo.svg";

type IconProps = SVGProps<SVGSVGElement> & {
  title?: string;
};
type BrandIconProps = ImgHTMLAttributes<HTMLImageElement> & {
  title?: string;
};

function BaseIcon({ title, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function BrandIcon(props: BrandIconProps) {
  const { title, alt, ...rest } = props;
  return (
    <img
      src={wireguardLogo}
      alt={alt ?? title ?? "WireGuard logo"}
      {...rest}
    />
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </BaseIcon>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="4" rx="1.5" />
      <rect x="13" y="10" width="7" height="10" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
    </BaseIcon>
  );
}

export function GroupIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="9" cy="9" r="3" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M4.5 18c.8-2.5 3-4 5.5-4s4.7 1.5 5.5 4" />
      <path d="M14.5 18c.5-1.8 2-3 4-3 1 0 1.9.3 2.7.9" />
    </BaseIcon>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19c1.2-3 3.9-4.8 7-4.8s5.8 1.8 7 4.8" />
    </BaseIcon>
  );
}

export function PeerIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3.5" y="6" width="7" height="5" rx="1.5" />
      <rect x="13.5" y="13" width="7" height="5" rx="1.5" />
      <path d="M10.5 8.5h3" />
      <path d="M13.5 8.5v7" />
    </BaseIcon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2" />
      <path d="M12 18.3v2.2" />
      <path d="M20.5 12h-2.2" />
      <path d="M5.7 12H3.5" />
      <path d="M18.2 5.8l-1.6 1.6" />
      <path d="M7.4 16.6l-1.6 1.6" />
      <path d="M18.2 18.2l-1.6-1.6" />
      <path d="M7.4 7.4 5.8 5.8" />
    </BaseIcon>
  );
}

export function LogsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 5.5h10" />
      <path d="M7 10h10" />
      <path d="M7 14.5h6" />
      <path d="M5 4.5h.01" />
      <path d="M5 9h.01" />
      <path d="M5 13.5h.01" />
      <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
    </BaseIcon>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.8 12h16.4" />
      <path d="M12 3.8c2.2 2.2 3.5 5.1 3.5 8.2s-1.3 6-3.5 8.2c-2.2-2.2-3.5-5.1-3.5-8.2S9.8 6 12 3.8Z" />
    </BaseIcon>
  );
}
