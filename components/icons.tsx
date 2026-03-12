import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function iconDefaults(props: IconProps) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16L21 21" />
    </svg>
  );
}

export function VolumeOnIcon(props: IconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <path d="M5 10H8.5L13 6.5V17.5L8.5 14H5Z" />
      <path d="M16 9.5C17.4 10.5 18 11.7 18 12C18 12.3 17.4 13.5 16 14.5" />
      <path d="M18.5 7.5C20.7 9.2 21.5 11.2 21.5 12C21.5 12.8 20.7 14.8 18.5 16.5" />
    </svg>
  );
}

export function VolumeOffIcon(props: IconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <path d="M5 10H8.5L13 6.5V17.5L8.5 14H5Z" />
      <path d="M16.5 9.5L21 14" />
      <path d="M21 9.5L16.5 14" />
    </svg>
  );
}

export function BookmarkIcon(props: IconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <path d="M7 4.5H17V20L12 16.5L7 20Z" />
    </svg>
  );
}

export function BookmarkFilledIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M7 4.5C7 3.95 7.45 3.5 8 3.5H16C16.55 3.5 17 3.95 17 4.5V20L12 16.6L7 20V4.5Z" />
    </svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <circle cx="18" cy="5.5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="M8.2 10.9L15.7 6.6" />
      <path d="M8.2 13.1L15.7 17.4" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.8L15.5 12L10 15.2Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SparkGridIcon(props: IconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <rect x="4.5" y="4.5" width="6" height="6" rx="1.2" />
      <rect x="13.5" y="4.5" width="6" height="6" rx="1.2" />
      <rect x="4.5" y="13.5" width="6" height="6" rx="1.2" />
      <rect x="13.5" y="13.5" width="6" height="6" rx="1.2" />
    </svg>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.8 12H20.2" />
      <path d="M12 3.5C14.6 5.8 16 8.8 16 12C16 15.2 14.6 18.2 12 20.5" />
      <path d="M12 3.5C9.4 5.8 8 8.8 8 12C8 15.2 9.4 18.2 12 20.5" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...iconDefaults(props)}>
      <path d="M5 7H19" />
      <path d="M5 12H19" />
      <path d="M5 17H19" />
    </svg>
  );
}
