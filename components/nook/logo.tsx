// Nook logomark, a line-art "nook" scene — a dressed bed under a framed
// landscape, beside a bookshelf with a plant — drawn in warm-white on a
// slate-navy rounded tile. Served from /public/logo.svg. The illustration
// bakes in the navy tile, so on dark surfaces (footer / auth panel, which
// pass variant="inverse") it would blend into the panel; there we sit it on a
// cream backing so it stays visible. The art itself is not recolourable here.

interface LogoMarkProps {
  size?: number;
  variant?: "default" | "inverse";
}

export function LogoMark({ size = 28, variant = "default" }: LogoMarkProps) {
  const radius = Math.round(size * 0.22);
  const img = (
    <img
      src="/logo.svg"
      width={size}
      height={size}
      alt="Nook"
      aria-hidden="true"
      style={{ display: "block", borderRadius: radius }}
    />
  );

  if (variant === "inverse") {
    // Cream backing + thin ring so the navy tile separates from a dark panel.
    const pad = Math.max(2, Math.round(size * 0.08));
    return (
      <span
        style={{
          display: "inline-flex",
          padding: pad,
          background: "#F5EFEB",
          borderRadius: radius + pad,
        }}
      >
        {img}
      </span>
    );
  }

  return img;
}
