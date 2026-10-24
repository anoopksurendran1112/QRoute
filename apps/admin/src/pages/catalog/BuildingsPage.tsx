import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../../api/client.ts";
import {
  createBuilding,
  deleteBuilding,
  listBuildings,
  updateBuilding,
  type BuildingDto,
} from "../../api/catalog.ts";
import { ConfirmDelete } from "../../components/catalog/ConfirmDelete.tsx";
import { EntityForm } from "../../components/catalog/EntityForm.tsx";
import { EntityTable } from "../../components/catalog/EntityTable.tsx";
import { buildingConfig } from "../../components/catalog/entityConfig.ts";

export function BuildingsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<BuildingDto | null>(null);
  const [deleteRow, setDeleteRow] = useState<BuildingDto | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["buildings"],
    queryFn: listBuildings,
  });

  const createMutation = useMutation({
    mutationFn: createBuilding,
    onSuccess: async () => {
      setServerError(null);
      setFormOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["buildings"] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setServerError(error.status === 400 ? error.message : error.message);
      } else {
        setServerError("Failed to create building");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      updateBuilding(id, input),
    onSuccess: async () => {
      setServerError(null);
      setEditRow(null);
      await queryClient.invalidateQueries({ queryKey: ["buildings"] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setServerError(error.message);
      } else {
        setServerError("Failed to update building");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBuilding,
    onSuccess: async () => {
      setDeleteError(null);
      setDeleteRow(null);
      await queryClient.invalidateQueries({ queryKey: ["buildings"] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setDeleteError(error.message);
      } else {
        setDeleteError("Failed to delete building");
      }
    },
  });

  const rows = (listQuery.data ?? []).map((row) => ({
    ...row,
    campus: row.campus ?? "-",
  }));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Buildings</h1>
            <p className="mt-1 text-sm text-slate-600">Create, edit and delete buildings.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditRow(null);
              setServerError(null);
              setFormOpen(true);
            }}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            New building
          </button>
        </header>

        {formOpen && !editRow ? (
          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-medium text-slate-900">New building</h2>
            <div className="mt-4">
              <EntityForm
                config={buildingConfig}
                mode="create"
                isPending={createMutation.isPending}
                serverError={serverError}
                onSubmit={async (values) => { await createMutation.mutateAsync(values as any); }}
                onCancel={() => {
                  setFormOpen(false);
                  setServerError(null);
                }}
              />
            </div>
          </section>
        ) : null}

        {editRow ? (
          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-medium text-slate-900">Edit building</h2>
            <div className="mt-4">
              <EntityForm
                config={buildingConfig}
                mode="edit"
                initialValues={{ code: editRow.code, name: editRow.name, campus: editRow.campus }}
                isPending={updateMutation.isPending}
                serverError={serverError}
                onSubmit={async (values) => { await updateMutation.mutateAsync({ id: editRow.id, input: values as any }); }}
                onCancel={() => {
                  setEditRow(null);
                  setServerError(null);
                }}
              />
            </div>
          </section>
        ) : null}

        <section className="mt-6">
          <EntityTable
            config={buildingConfig}
            rows={rows}
            isLoading={listQuery.isLoading}
            onEdit={(row) => {
              setEditRow(row as unknown as BuildingDto);
              setFormOpen(false);
              setServerError(null);
            }}
            onDelete={(row) => {
              setDeleteRow(row as unknown as BuildingDto);
              setDeleteError(null);
            }}
          />
        </section>
      </div>

      <ConfirmDelete
        open={deleteRow !== null}
        recordLabel={deleteRow ? `${deleteRow.code} — ${deleteRow.name}` : ""}
        isPending={deleteMutation.isPending}
        error={deleteError}
        onConfirm={() => {
          if (deleteRow) deleteMutation.mutate(deleteRow.id);
        }}
        onCancel={() => {
          setDeleteRow(null);
          setDeleteError(null);
        }}
      />
    </main>
  );
}
