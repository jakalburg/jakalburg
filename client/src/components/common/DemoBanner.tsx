export function DemoBanner({ text = "Demo checkout — no payment will be processed." }) {
  return (
    <div className="border border-line bg-sand/40 px-4 py-3 text-xs text-foreground">
      {text}
    </div>
  );
}
