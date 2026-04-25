import { Spinner } from "./Spinner";

export type LoadingBlockProps = {
  title: string;
  description?: string;
  className?: string;
  /** Use for full-page or MSW bootstrap */
  fullPage?: boolean;
};

export function LoadingBlock({
  title,
  description,
  className = "",
  fullPage = false,
}: LoadingBlockProps) {
  const inner = (
    <div
      className={`flex flex-col items-center justify-center gap-4 text-center ${className}`}
    >
      <Spinner size={28} label={title} />
      <div className="space-y-1">
        <p className="text-sm font-medium text-neutral-800">{title}</p>
        {description ? (
          <p className="max-w-sm text-xs text-neutral-500">{description}</p>
        ) : null}
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center p-8">
        {inner}
      </div>
    );
  }

  return inner;
}
