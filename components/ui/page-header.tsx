type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="space-y-3">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">
        {eyebrow}
      </p>
      <div className="space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
          {title}
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-slate-600 md:text-base">{description}</p>
      </div>
    </header>
  );
}

