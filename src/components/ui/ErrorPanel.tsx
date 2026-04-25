export type ErrorPanelProps = {
  title: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorPanel({
  title,
  message,
  onRetry,
  retryLabel = "Try again",
}: ErrorPanelProps) {
  return (
    <div
      className="rounded-2xl border border-red-200/90 bg-gradient-to-b from-red-50/95 to-orange-50/30 p-6 text-left shadow-card"
      role="alert"
    >
      <div className="flex gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-lg font-bold text-red-700"
          aria-hidden
        >
          !
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-red-950">{title}</p>
          {message ? (
            <p className="mt-1.5 text-sm leading-relaxed text-red-900/85">{message}</p>
          ) : null}
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex items-center rounded-xl bg-red-900 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-red-800"
            >
              {retryLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
