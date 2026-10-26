"use client";

/** Form seviyesindeki genel hata gösterimi (10.4 FormErrorSummary). */
export function FormErrorSummary({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-medium border border-danger-200 bg-danger-50 px-4 py-3 text-small text-danger-600 dark:border-danger-100 dark:bg-danger-100/20"
    >
      {message}
    </div>
  );
}
