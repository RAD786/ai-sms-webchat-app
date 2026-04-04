type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <section className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-900">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">{description}</p>
    </section>
  );
}

