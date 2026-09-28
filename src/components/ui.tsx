import Link from "next/link";

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h1 className="text-lg font-semibold" style={{ color: "var(--viz-text-primary)" }}>
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-sm" style={{ color: "var(--viz-text-secondary)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--viz-text-muted)" }}>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border p-4 ${className}`}
      style={{ background: "var(--viz-surface)", borderColor: "var(--viz-gridline)" }}
    >
      {children}
    </div>
  );
}

/** A count tile that links to its detail list. Tone uses status colours only with a text label. */
export function CountTile({
  label,
  value,
  href,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: number | string;
  href?: string;
  tone?: "neutral" | "warning" | "critical" | "good";
  hint?: string;
}) {
  const accent = {
    neutral: "var(--viz-gridline)",
    good: "var(--viz-status-good)",
    warning: "var(--viz-status-warning)",
    critical: "var(--viz-status-critical)",
  }[tone];
  const body = (
    <div
      className="h-full rounded-xl border p-4 transition-colors hover:border-neutral-400"
      style={{ background: "var(--viz-surface)", borderColor: "var(--viz-gridline)", borderLeft: `3px solid ${accent}` }}
    >
      <p className="text-xs" style={{ color: "var(--viz-text-secondary)" }}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold" style={{ color: "var(--viz-text-primary)" }}>
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs" style={{ color: "var(--viz-text-muted)" }}>
          {hint}
        </p>
      )}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warning" | "critical" | "good" }) {
  const color = {
    neutral: "var(--viz-text-secondary)",
    good: "var(--viz-good)",
    warning: "#9a6a00",
    critical: "var(--viz-status-critical)",
  }[tone];
  return (
    <span className="inline-block rounded-full border px-2 py-0.5 text-xs" style={{ color, borderColor: "currentColor" }}>
      {children}
    </span>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ color: "var(--viz-text-muted)" }}>
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-2 text-left font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody style={{ color: "var(--viz-text-primary)" }}>
          {empty ? (
            <tr>
              <td colSpan={head.length} className="px-4 py-6 text-center" style={{ color: "var(--viz-text-muted)" }}>
                Nothing here right now.
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </Card>
  );
}

export function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`px-4 py-2 align-top ${className}`} style={{ borderTop: "1px solid var(--viz-gridline)" }}>
      {children}
    </td>
  );
}

export const inputClass =
  "rounded-md border px-2 py-1 text-sm outline-none focus:border-neutral-500 bg-transparent";
export const buttonClass =
  "rounded-md bg-neutral-900 px-3 py-1 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900";
