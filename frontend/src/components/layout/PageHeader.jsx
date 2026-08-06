/**
 * PageHeader
 * Reusable page title block (title + optional description + optional actions).
 * Composition of semantic elements + design tokens. Used across dashboard pages
 * for a consistent header rhythm.
 */
export const PageHeader = ({ title, description, children }) => {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? (
        <div className="flex items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
};
