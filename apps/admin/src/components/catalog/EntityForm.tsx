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
      const raw = values[field.name];
      if (raw === "" || raw === null || (typeof raw === "number" && Number.isNaN(raw))) {
        if (field.required && mode === "create") {
          normalized[field.name] = raw;
        }
        continue;
      }
      const coerced = coerceValue(field.type, raw);
      if (coerced !== undefined) {
        normalized[field.name] = coerced;
      } else if (mode === "create" && field.required) {
        normalized[field.name] = raw;
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
            <label key={field.name} className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-[#061d30]">{field.label}</span>
              <select
                {...register(field.name)}
                className="rounded-md border border-[#c0c7d0] px-3 py-2 text-sm text-[#061d30] focus:border-[#006699] focus:outline-none focus:ring-1 focus:ring-[#006699]/20"
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
              {field.helpText ? <span className="text-xs text-[#707880]">{field.helpText}</span> : null}
            </label>
          );
        }

        return (
          <label key={field.name} className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-[#061d30]">{field.label}</span>
            <input
              type={field.type}
              {...register(field.name, {
                setValueAs: field.type === "number" ? (v) => (v === "" || v === null ? undefined : v) : undefined,
              })}
              placeholder={field.placeholder}
              className="rounded-md border border-[#c0c7d0] px-3 py-2 text-sm text-[#061d30] placeholder:text-[#707880] focus:border-[#006699] focus:outline-none focus:ring-1 focus:ring-[#006699]/20"
            />
            {error?.message ? (
              <span className="text-xs text-red-600">{String(error.message)}</span>
            ) : null}
            {field.helpText ? <span className="text-xs text-[#707880]">{field.helpText}</span> : null}
          </label>
        );
      })}

      {serverError ? (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
          <p role="alert" className="text-sm text-[#ba1a1a]">
            {serverError}
          </p>
        </div>
      ) : null}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-md bg-[#006699] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#004b72] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? "Saving…" : mode === "create" ? "Create" : "Save"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[#c0c7d0] px-4 py-2 text-sm text-[#40484f] transition-colors hover:bg-[#f5f7fa]"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
