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
      className="rounded-xl border border-red-200 bg-red-50 p-5 text-left shadow-sm"
      role="alert"
    >
      <p className="text-sm font-semibold text-red-900">{title}</p>
      {message ? (
        <p className="mt-1 text-sm text-red-800/90">{message}</p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center rounded-md bg-red-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-950"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
