export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="pmg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2563eb" />
          <stop offset="1" stopColor="#172554" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#pmg)" />
      <circle cx="32" cy="32" r="12" fill="#fff" />
      <ellipse cx="32" cy="32" rx="26" ry="8" fill="none" stroke="#fff" strokeWidth="3" transform="rotate(-22 32 32)" />
    </svg>
  );
}
