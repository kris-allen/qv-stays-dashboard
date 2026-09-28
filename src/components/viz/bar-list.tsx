type BarListProps = {
  title: string;
  rows: { label: string; value: number }[];
  valueFormatter?: (value: number) => string;
};

/**
 * Horizontal magnitude-by-category bars. Single hue by design (dataviz skill:
 * a bar chart with categories on the axis needs identity from the label, not
 * per-bar color) with a visible numeric label so nothing relies on color alone.
 */
export function BarList({ title, rows, valueFormatter = (v) => String(v) }: BarListProps) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: "var(--viz-surface)", borderColor: "var(--viz-gridline)" }}
    >
      <p className="text-sm font-medium" style={{ color: "var(--viz-text-primary)" }}>
        {title}
      </p>
      <div className="mt-4 space-y-2.5">
        {rows.length === 0 && (
          <p className="text-sm" style={{ color: "var(--viz-text-muted)" }}>
            No data yet.
          </p>
        )}
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <span
              className="w-28 shrink-0 truncate text-sm"
              style={{ color: "var(--viz-text-secondary)" }}
              title={row.label}
            >
              {row.label}
            </span>
            <div
              className="h-2 flex-1 overflow-hidden rounded-full"
              style={{ background: "var(--viz-gridline)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(row.value / max) * 100}%`,
                  background: "var(--viz-series-1)",
                }}
              />
            </div>
            <span
              className="shrink-0 text-right text-sm tabular-nums"
              style={{ color: "var(--viz-text-primary)", minWidth: "3.5rem" }}
            >
              {valueFormatter(row.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
