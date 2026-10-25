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
    return <div className="px-6 py-8 text-center text-sm text-[#707880]">Loading...</div>;
  }

  if (rows.length === 0) {
    return <div className="px-6 py-8 text-center text-sm text-[#707880]">No records yet.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-[#d0e4ff] text-sm">
        <thead className="bg-[#f8f9ff]">
          <tr>
            {config.columns.map((column) => (
              <th
                key={column.key}
                className="px-6 py-3 text-left text-xs font-medium text-[#525f75] uppercase tracking-wider"
              >
                {column.label}
              </th>
            ))}
            <th className="px-6 py-3 text-right text-xs font-medium text-[#525f75] uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#d0e4ff] bg-white">
          {rows.map((row) => {
            const id = row[config.idField];
            return (
              <tr key={String(id)} className="hover:bg-[#f8f9ff]/50 transition-colors">
                {config.columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-[#061d30]">
                    {column.key === "entranceNodeId"
                      ? row[column.key]
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Yes</span>
                        : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">No</span>
                      : getCellValue(row, column.key)}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <div className="flex justify-end gap-3">
                    {onEdit ? (
                      <button
                        type="button"
                        onClick={() => onEdit(row)}
                        className="text-[#006699] hover:text-[#004b72] font-medium"
                      >
                        Edit
                      </button>
                    ) : null}
                    {onDelete ? (
                      <button
                        type="button"
                        onClick={() => onDelete(row)}
                        className="text-red-600 hover:text-red-700 font-medium"
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
