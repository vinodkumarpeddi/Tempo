export default function Logo({
  className = "size-8",
  rounded = "rounded-lg",
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    <span
      className={`bg-sidebar-primary inline-flex shrink-0 items-center justify-center ${rounded} ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-[62%]" aria-hidden>
        {/* headroom: the chevron rising above the baseline */}
        <path
          d="M6 13.5 12 8l6 5.5"
          stroke="white"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M6.5 17.5h11" stroke="white" strokeWidth={2.6} strokeLinecap="round" opacity={0.5} />
      </svg>
    </span>
  );
}
