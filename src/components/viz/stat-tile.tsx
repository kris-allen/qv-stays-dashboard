type StatTileProps = {
  label: string;
  value: string;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  caption?: string;
};

export function StatTile({ label, value, delta, caption }: StatTileProps) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: "var(--viz-surface)", borderColor: "var(--viz-gridline)" }}
    >
      <p className="text-sm" style={{ color: "var(--viz-text-secondary)" }}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold" style={{ color: "var(--viz-text-primary)" }}>
        {value}
      </p>
      {(delta || caption) && (
        <p className="mt-1 text-xs" style={{ color: "var(--viz-text-muted)" }}>
          {delta && (
            <span
              style={{
                color:
                  delta.direction === "up"
                    ? "var(--viz-good)"
                    : delta.direction === "down"
                      ? "var(--viz-status-critical)"
                      : "var(--viz-text-muted)",
              }}
            >
              {delta.direction === "up" ? "↑" : delta.direction === "down" ? "↓" : "→"}{" "}
              {delta.value}
            </span>
          )}
          {delta && caption && " · "}
          {caption}
        </p>
      )}
    </div>
  );
}
