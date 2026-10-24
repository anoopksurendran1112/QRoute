import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../../api/client.ts";
import {
  createFloor,
  deleteFloor,
  listBuildings,
  listFloors,
  updateFloor,
  type FloorDto,
} from "../../api/catalog.ts";
import { ConfirmDelete } from "../../components/catalog/ConfirmDelete.tsx";
import { EntityForm } from "../../components/catalog/EntityForm.tsx";
import { EntityTable } from "../../components/catalog/EntityTable.tsx";
import { floorConfig } from "../../components/catalog/entityConfig.ts";

export function FloorsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<FloorDto | null>(null);
  const [deleteRow, setDeleteRow] = useState<FloorDto | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const listQuery = useQuery({ queryKey: ["floors"], queryFn: () => listFloors() });
  const buildingsQuery = useQuery({ queryKey: ["buildings"], queryFn: listBuildings });

  const createMutation = useMutation({
    mutationFn: createFloor,
    onSuccess: async () => {
      setServerError(null);
      setFormOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["floors"] });
    },
    onError: (error) => {
      setServerError(error instanceof ApiError ? error.message : "Failed to create floor");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) => updateFloor(id, input),
    onSuccess: async () => {
      setServerError(null);
      setEditRow(null);
      await queryClient.invalidateQueries({ queryKey: ["floors"] });
    },
    onError: (error) => {
      setServerError(error instanceof ApiError ? error.message : "Failed to update floor");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFloor,
    onSuccess: async () => {
      setDeleteError(null);
      setDeleteRow(null);
      await queryClient.invalidateQueries({ queryKey: ["floors"] });
    },
    onError: (error) => {
      setDeleteError(error instanceof ApiError ? error.message : "Failed to delete floor");
    },
  });

  const rows = (listQuery.data ?? []).map((row) => ({
    ...row,
    building: row.building?.name ?? row.buildingId,
    name: row.name ?? "-",
    imagePath: row.imagePath ?? "-",
  }));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Floors</h1>
            <p className="mt-1 text-sm text-slate-600">Manage floor calibration (meters per pixel).</p>
          </div>
          <button type="button" onClick={() => { setEditRow(null); setServerError(null); setFormOpen(true); }} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            New floor
          </button>
        </header>

        {formOpen && !editRow ? (
          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-medium text-slate-900">New floor</h2>
            <div className="mt-4">
              <EntityForm config={floorConfig} mode="create" buildings={buildingsQuery.data ?? []} isPending={createMutation.isPending} serverError={serverError} onSubmit={async (values) => { await (createMutation.mutateAsync as any)(values); }} onCancel={() => { setFormOpen(false); setServerError(null); }} />
            </div>
          </section>
        ) : null}

        {editRow ? (
          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-medium text-slate-900">Edit floor</h2>
            <div className="mt-4">
              <EntityForm config={floorConfig} mode="edit" initialValues={{ buildingId: editRow.buildingId, level: editRow.level, name: editRow.name ?? "", metersPerPixel: editRow.metersPerPixel, widthPx: editRow.widthPx ?? "", heightPx: editRow.heightPx ?? "", imagePath: editRow.imagePath ?? "" }} buildings={buildingsQuery.data ?? []} isPending={updateMutation.isPending} serverError={serverError} onSubmit={async (values) => { await (updateMutation.mutateAsync as any)({ id: editRow.id, input: values }); }} onCancel={() => { setEditRow(null); setServerError(null); }} />
            </div>
          </section>
        ) : null}

        <section className="mt-6">
          <EntityTable
            config={floorConfig}
            rows={rows}
            isLoading={listQuery.isLoading}
            onEdit={(row) => {
              setEditRow(row as unknown as FloorDto);
              setFormOpen(false);
              setServerError(null);
            }}
            onDelete={(row) => {
              setDeleteRow(row as unknown as FloorDto);
              setDeleteError(null);
            }}
          />
        </section>
      </div>

      <ConfirmDelete
        open={deleteRow !== null}
        recordLabel={deleteRow ? `${(deleteRow.building as any)?.name ?? deleteRow.buildingId} Level ${deleteRow.level}` : ""}
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
