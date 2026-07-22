import { cn } from "@/lib/utils";

/**
 * The Candor mark: an open aperture ("C") with a focal dot at its center —
 * an opening for honest words, and a lens that sees clearly. Monochrome and
 * theme-agnostic (draws in currentColor).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M18.5 6.5 A8.5 8.5 0 1 0 18.5 17.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="2.3" fill="currentColor" />
    </svg>
  );
}

/**
 * Full lockup: the mark in an ink tile plus the "Candor" wordmark.
 * Pass `showWord={false}` for the mark-only variant.
 */
export function Logo({
  className,
  showWord = true,
}: {
  className?: string;
  showWord?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <LogoMark className="h-4 w-4" />
      </span>
      {showWord && (
        <span className="text-sm font-semibold tracking-tight">Candor</span>
      )}
    </span>
  );
}

export default Logo;
