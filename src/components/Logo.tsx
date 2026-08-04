export default function Logo({
  className = "size-8",
  rounded = "rounded-lg",
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center border border-white/10 bg-[#0a0a0a] ${rounded} ${className}`}
    >
      {/* tempo: usage rises and resets like a beat */}
      <svg viewBox="0 0 24 24" fill="white" className="size-[62%]" aria-hidden>
        <rect x="4.6" y="12.5" width="3.6" height="7" rx="1.8" />
        <rect x="10.2" y="8.5" width="3.6" height="11" rx="1.8" />
        <rect x="15.8" y="4.5" width="3.6" height="15" rx="1.8" />
      </svg>
    </span>
  );
}
