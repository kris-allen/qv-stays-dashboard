import type { TrackedClean } from "@/lib/cleans";
import { CLEAN_TYPE_LABELS, formatDate } from "@/lib/labels";
import { assignSe, completeClean } from "@/app/actions";
import { Badge, Table, Td, buttonClass, inputClass } from "@/components/ui";

export function CleansTable({
  cleans,
  mode,
  seNames = [],
  note,
}: {
  cleans: TrackedClean[];
  /** "assign": Nex picks an SE. "complete": the SE marks it done. "view": read only. */
  mode: "assign" | "complete" | "view";
  seNames?: string[];
  /** Optional extra column, e.g. why a booking failed. */
  note?: (clean: TrackedClean) => React.ReactNode;
}) {
  const head = ["Date", "Property", "Type", "SE", "Status", ...(note ? ["Note"] : []), ...(mode === "view" ? [] : [""])];

  return (
    <Table head={head} empty={cleans.length === 0}>
      {cleans.map((c) => (
        <tr key={c.key}>
          <Td className="whitespace-nowrap">{formatDate(c.date)}</Td>
          <Td>{c.listingName}</Td>
          <Td className="whitespace-nowrap">
            {CLEAN_TYPE_LABELS[c.type]} {c.sdt && <Badge tone="warning">SDT</Badge>}
          </Td>
          <Td>{c.se ?? <span style={{ color: "var(--viz-text-muted)" }}>Unassigned</span>}</Td>
          <Td>
            {c.cancelled ? (
              <Badge tone="critical">Cancelled</Badge>
            ) : c.completed ? (
              <Badge tone="good">Completed</Badge>
            ) : (
              <Badge>Scheduled</Badge>
            )}
          </Td>
          {note && <Td>{note(c)}</Td>}
          {mode === "assign" && (
            <Td>
              {!c.cancelled && !c.completed && (
                <form action={assignSe} className="flex gap-2">
                  <input type="hidden" name="clean_key" value={c.key} />
                  <select name="se" defaultValue={c.se ?? ""} className={inputClass} aria-label="Assign SE">
                    <option value="">Unassigned</option>
                    {seNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <button className={buttonClass}>Save</button>
                </form>
              )}
            </Td>
          )}
          {mode === "complete" && (
            <Td>
              {!c.cancelled && !c.completed && (
                <form action={completeClean}>
                  <input type="hidden" name="clean_key" value={c.key} />
                  <button className={buttonClass}>Mark done</button>
                </form>
              )}
            </Td>
          )}
        </tr>
      ))}
    </Table>
  );
}
