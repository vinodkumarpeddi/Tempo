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
      {/* brimly: the ring is the limit, the arc is how full you are */}
      <svg viewBox="0 0 24 24" fill="none" className="size-[64%]" aria-hidden>
        <circle cx="12" cy="12" r="7.5" stroke="white" strokeOpacity="0.3" strokeWidth="3.2" />
        <circle
          cx="12"
          cy="12"
          r="7.5"
          stroke="white"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeDasharray="33 47.1"
          transform="rotate(-90 12 12)"
        />
      </svg>
    </span>
  );
}
