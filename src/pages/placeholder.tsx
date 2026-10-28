type Props = { title: string; text: string };

export function PlaceholderPage({ title, text }: Props) {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-prose text-dim">{text}</p>
    </section>
  );
}
