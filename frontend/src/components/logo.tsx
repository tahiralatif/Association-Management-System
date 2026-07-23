"use client";

export default function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = size === "sm" ? 28 : size === "lg" ? 48 : 36;
  const fontSize = size === "sm" ? 11 : size === "lg" ? 16 : 13;

  return (
    <svg
      width={dims}
      height={dims}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="50%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
        <linearGradient id="logoGrad2" x1="48" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer ring */}
      <rect x="2" y="2" width="44" height="44" rx="12" stroke="url(#logoGrad)" strokeWidth="2" fill="none" opacity="0.6" />

      {/* Inner glow rect */}
      <rect x="5" y="5" width="38" height="38" rx="9" fill="url(#logoGrad)" opacity="0.08" />

      {/* Abstract "A" mark — geometric, premium */}
      <path
        d="M24 11L35 35H29.5L27.5 30H20.5L18.5 35H13L24 11Z"
        fill="url(#logoGrad)"
        filter="url(#glow)"
      />
      {/* Crossbar */}
      <path
        d="M21 26H27L24 19.5L21 26Z"
        fill="url(#logoGrad2)"
        opacity="0.9"
      />

      {/* Accent dot */}
      <circle cx="24" cy="14" r="1.5" fill="#5eead4" opacity="0.8" />

      {/* Corner accents */}
      <line x1="8" y1="8" x2="13" y2="8" stroke="#2dd4bf" strokeWidth="1" opacity="0.3" />
      <line x1="8" y1="8" x2="8" y2="13" stroke="#2dd4bf" strokeWidth="1" opacity="0.3" />
      <line x1="35" y1="40" x2="40" y2="40" stroke="#2dd4bf" strokeWidth="1" opacity="0.3" />
      <line x1="40" y1="35" x2="40" y2="40" stroke="#2dd4bf" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}
