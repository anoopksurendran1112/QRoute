import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { ZodType } from "zod";
import type { EntityConfig } from "./entityConfig.ts";

interface EntityFormProps {
  config: EntityConfig;
  mode: "create" | "edit";
  initialValues?: Record<string, unknown>;
  buildings?: Array<{ id: string; code: string; name: string }>;
  floors?: Array<{ id: string; level: number; name: string | null; building?: { code: string } }>;
  departments?: Array<{ id: string; code: string; name: string }>;
  isPending?: boolean;
  serverError?: string | null;
  onSubmit: (values: Record<string, unknown>) => Promise<void> | void;
  onCancel?: () => void;
}

function coerceValue(type: string, value: unknown): unknown {
  if (value === "" || value === null || value === undefined) return undefined;
  if (type === "number") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
}

export function EntityForm({
  config,
  mode,
  initialValues = {},
  buildings = [],
  floors = [],
  departments = [],
  isPending = false,
  serverError = null,
  onSubmit,
  onCancel,
}: EntityFormProps) {
  const schema = (mode === "create" ? config.createSchema : config.updateSchema) as ZodType<any>;
  const form = useForm<any>({
    resolver: zodResolver(schema as any),
    defaultValues: initialValues,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  async function submit(values: Record<string, unknown>) {
    const normalized: Record<string, unknown> = {};
    for (const field of config.fields) {
      const coerced = coerceValue(field.type, values[field.name]);
      if (coerced !== undefined) {
        normalized[field.name] = coerced;
      } else if (mode === "create" && field.required) {
        normalized[field.name] = values[field.name];
      }
    }
    await (onSubmit as (v: Record<string, unknown>) => Promise<void> | void)(normalized);
  }

  function optionsFor(source?: string) {
    if (source === "buildings") {
      return buildings.map((building) => ({ value: building.id, label: `${building.code} — ${building.name}` }));
    }
    if (source === "floors") {
      return floors.map((floor) => ({
        value: floor.id,
        label: floor.name ?? `Level ${floor.level}${floor.building?.code ? ` (${floor.building.code})` : ""}`,
      }));
    }
    if (source === "departments") {
      return departments.map((department) => ({ value: department.id, label: `${department.code} — ${department.name}` }));
    }
    return [];
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      {config.fields.map((field) => {
        const error = errors[field.name];
        const options = optionsFor(field.optionsSource);

        if (field.type === "select") {
          return (
            <label key={field.name} className="flex flex-col gap-1 text-sm text-slate-700">
              {field.label}
              <select
                {...register(field.name)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {error?.message ? (
                <span className="text-xs text-red-600">{String(error.message)}</span>
              ) : null}
              {field.helpText ? <span className="text-xs text-slate-500">{field.helpText}</span> : null}
            </label>
          );
        }

        return (
          <label key={field.name} className="flex flex-col gap-1 text-sm text-slate-700">
            {field.label}
            <input
              type={field.type}
              {...register(field.name)}
              placeholder={field.placeholder}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {error?.message ? (
              <span className="text-xs text-red-600">{String(error.message)}</span>
            ) : null}
            {field.helpText ? <span className="text-xs text-slate-500">{field.helpText}</span> : null}
          </label>
        );
      })}

      {serverError ? (
        <p role="alert" className="text-sm text-red-600">
          {serverError}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Saving…" : mode === "create" ? "Create" : "Save"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
