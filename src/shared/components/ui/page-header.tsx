export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="workspace-page-heading text-[26px] font-semibold leading-tight tracking-[-0.035em] text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="workspace-page-description mt-2 text-[13px] leading-relaxed text-default-500">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
      ) : null}
    </div>
  );
}
