"use client";

export default function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-border/70 border-b">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-3 px-6 pt-7 pb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
