export function KMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(16 16) scale(0.7) translate(-16 -16)"
      >
        <path d="M10 6 V26" />
        <path d="M12 16 L24 6" />
        <path d="M12 16 L24 26" />
      </g>
    </svg>
  );
}
