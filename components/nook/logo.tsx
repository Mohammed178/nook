// Nook logomark — a doorway arch (the "nook") with a powder-blue lamp dot
// inside, doubling as a lowercase "n". Slate-navy tile, warm-white line.
// `default` sits on light surfaces; `inverse` sits on dark ones (footer,
// auth panel) by flipping tile and line. The tile colour tracks --brand-500.

interface LogoMarkProps {
  size?: number;
  variant?: "default" | "inverse";
}

export function LogoMark({ size = 28, variant = "default" }: LogoMarkProps) {
  const tile = variant === "inverse" ? "#F5EFEB" : "var(--brand-500, #2F4156)";
  const line = variant === "inverse" ? "#2F4156" : "#F5EFEB";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="9" fill={tile} />
      <path
        d="M9.5 23.5 V17 a6.5 6.5 0 0 1 13 0 v6.5"
        fill="none"
        stroke={line}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="16" cy="20.5" r="2.2" fill="#C8D9E6" />
    </svg>
  );
}
