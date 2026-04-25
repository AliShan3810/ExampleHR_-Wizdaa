export type SpinnerProps = {
  className?: string;
  /** Pixel size of the icon box (default 20) */
  size?: number;
  label?: string;
};

export function Spinner({ className = "", size = 20, label }: SpinnerProps) {
  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      role={label ? "status" : "presentation"}
      aria-label={label}
    >
      {label ? <span className="sr-only">{label}</span> : null}
      <svg
        className="animate-spin text-emerald-600"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <circle
          className="opacity-20"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-80"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </span>
  );
}
