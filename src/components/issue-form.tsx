import { logIssue } from "@/app/actions";
import { ISSUE_LABELS, ISSUE_TABS } from "@/lib/sheet-schema";
import { Card, buttonClass, inputClass } from "@/components/ui";

export function IssueForm({ properties }: { properties: string[] }) {
  return (
    <Card>
      <form action={logIssue} className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm" style={{ color: "var(--viz-text-secondary)" }}>
          Type
          <select name="kind" required className={inputClass}>
            {ISSUE_TABS.map((tab) => (
              <option key={tab} value={tab}>
                {ISSUE_LABELS[tab]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm" style={{ color: "var(--viz-text-secondary)" }}>
          Property
          <input name="property" list="property-options" required className={inputClass} />
          <datalist id="property-options">
            {properties.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2" style={{ color: "var(--viz-text-secondary)" }}>
          What happened (or the item found)
          <textarea name="description" required rows={3} className={inputClass} />
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2" style={{ color: "var(--viz-text-secondary)" }}>
          Photo link (Google Drive, optional)
          <input name="photo_link" type="url" className={inputClass} />
        </label>
        <div>
          <button className={buttonClass}>Log issue</button>
        </div>
      </form>
    </Card>
  );
}
