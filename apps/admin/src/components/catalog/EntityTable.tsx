import type { EntityConfig } from "./entityConfig.ts";

interface EntityTableProps {
  config: EntityConfig;
  rows: Array<Record<string, unknown>>;
  isLoading?: boolean;
  onEdit?: (row: Record<string, unknown>) => void;
  onDelete?: (row: Record<string, unknown>) => void;
}

function getCellValue(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (value === null || value === undefined) return "-";
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.name === "string") return record.name;
    if (typeof record.code === "string") return record.code;
    if (typeof record.email === "string") return record.email;
    if (typeof record.level === "number") return `Level ${record.level}`;
    return JSON.stringify(value);
  }
  return String(value);
}

export function EntityTable({
  config,
  rows,
  isLoading = false,
  onEdit,
  onDelete,
}: EntityTableProps) {
  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading...</div>;
  }

  if (rows.length === 0) {
    return <div className="text-sm text-slate-500">No records yet.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {config.columns.map((column) => (
              <th
                key={column.key}
                className="px-4 py-2 text-left font-medium text-slate-600"
              >
                {column.label}
              </th>
            ))}
            <th className="px-4 py-2 text-right font-medium text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {rows.map((row) => {
            const id = row[config.idField];
            return (
              <tr key={String(id)}>
                {config.columns.map((column) => (
                  <td key={column.key} className="px-4 py-2 text-slate-700">
                    {column.key === "entranceNodeId"
                      ? row[column.key]
                        ? "Yes"
                        : "No"
                      : getCellValue(row, column.key)}
                  </td>
                ))}
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    {onEdit ? (
                      <button
                        type="button"
                        onClick={() => onEdit(row)}
                        className="text-sm text-slate-700 underline"
                      >
                        Edit
                      </button>
                    ) : null}
                    {onDelete ? (
                      <button
                        type="button"
                        onClick={() => onDelete(row)}
                        className="text-sm text-red-600 underline"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
