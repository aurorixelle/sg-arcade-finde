// Minimal inline SVG icon set (stroke style, currentColor) — used by the
// mobile tab bar, bottom sheet and collapsible filters. Sized via `size`.

function Svg({ size = 22, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconList({ size }) {
  return (
    <Svg size={size}>
      <line x1="8" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="20" y2="12" />
      <line x1="8" y1="18" x2="20" y2="18" />
      <circle cx="4.2" cy="6" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="4.2" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="4.2" cy="18" r="0.9" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconMap({ size }) {
  return (
    <Svg size={size}>
      <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" />
      <line x1="9" y1="4" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="20" />
    </Svg>
  );
}

export function IconPulse({ size }) {
  return (
    <Svg size={size}>
      <polyline points="2.5 12.5 6.5 12.5 9 6 13 18 15.5 12.5 21.5 12.5" />
    </Svg>
  );
}

export function IconUser({ size }) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 20c1.2-3.4 4-5 7.2-5s6 1.6 7.2 5" />
    </Svg>
  );
}

export function IconShield({ size }) {
  return (
    <Svg size={size}>
      <path d="M12 3.5 5 6v5.5c0 4.4 3 7.4 7 9 4-1.6 7-4.6 7-9V6l-7-2.5Z" />
      <polyline points="9 11.8 11.2 14 15 10" />
    </Svg>
  );
}

export function IconClose({ size }) {
  return (
    <Svg size={size}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </Svg>
  );
}

export function IconChevron({ size, style, className }) {
  return (
    <Svg size={size} style={style} className={className}>
      <polyline points="7 10 12 15 17 10" />
    </Svg>
  );
}

export function IconPin({ size }) {
  return (
    <Svg size={size}>
      <path d="M12 21s-6.5-5.4-6.5-10.2a6.5 6.5 0 0 1 13 0C18.5 15.6 12 21 12 21Z" />
      <circle cx="12" cy="10.5" r="2.3" />
    </Svg>
  );
}
