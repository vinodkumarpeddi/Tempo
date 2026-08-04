import { cn } from '@/lib/cn';

function initials(name: string): string {
  // numeric tokens (employee codes, "Employee 0042") carry no identity — skip them
  // (name ?? ''): a rowless or mistyped caller must degrade to '?', never crash
  // the route — a nameless row took down whole pages twice already.
  const parts = (name ?? '')
    .trim()
    .split(/\s+/)
    .filter((part) => part && !/^\d+$/.test(part));
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

/**
 * Tinted tones for `colorful` avatars. Tint carries the colour, ink stays
 * readable in both schemes — the house rule that marks carry colour while text
 * stays legible. Deliberately soft: a social wall, not a highlighter.
 */
const TONES = [
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300',
] as const;

/** Stable per-name tone: the same person is the same colour on every surface. */
function toneOf(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return TONES[hash % TONES.length];
}

/**
 * Initials avatar. Neutral grey by default — muted on the surface, no colour,
 * for the premium read the statement pages want (matches app-demo).
 *
 * `colorful` opts into a stable per-name tint, for social surfaces (the engage
 * wall) where a column of identical grey discs makes every author look the
 * same. Size via `className` (defaults to size-9).
 */
export function MonogramAvatar({
  name,
  className,
  colorful,
}: {
  name: string;
  className?: string;
  colorful?: boolean;
}) {
  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold select-none',
        colorful ? toneOf(name) : 'bg-muted text-foreground',
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
