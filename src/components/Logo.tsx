import { cn } from "@/lib/utils";

/**
 * The Whistr mark: a focal dot with two arcs rippling outward — a whisper
 * travelling as sound. Monochrome and theme-agnostic (draws in currentColor).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="7" cy="12" r="2.2" fill="currentColor" />
      <path
        d="M12 8.5a5 5 0 0 1 0 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M15.5 6a9 9 0 0 1 0 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Full lockup: the mark in an ink tile plus the "Whistr" wordmark.
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
        <span className="text-sm font-semibold tracking-tight">Whistr</span>
      )}
    </span>
  );
}

export default Logo;
