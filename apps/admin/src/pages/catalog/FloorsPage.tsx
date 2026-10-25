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
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
            Floors
          </h1>
          <p className="mt-1 text-sm text-[#40484f]">Manage floor calibration (meters per pixel).</p>
        </div>
        <button
          type="button"
          onClick={() => { setEditRow(null); setServerError(null); setFormOpen(true); }}
          className="rounded-md bg-[#006699] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#004b72] focus:outline-none focus:ring-2 focus:ring-[#006699]/30"
        >
          + New floor
        </button>
      </header>

      {(formOpen && !editRow) || editRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#d0e4ff] px-6 py-4 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
                {editRow ? "Edit floor" : "New floor"}
              </h2>
              <button
                onClick={() => {
                  setFormOpen(false);
                  setEditRow(null);
                  setServerError(null);
                }}
                className="text-[#707880] hover:text-[#061d30]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4">
              {editRow ? (
                <EntityForm config={floorConfig} mode="edit" initialValues={{ buildingId: editRow.buildingId, level: editRow.level, name: editRow.name ?? "", metersPerPixel: editRow.metersPerPixel, widthPx: editRow.widthPx ?? "", heightPx: editRow.heightPx ?? "", imagePath: editRow.imagePath ?? "" }} buildings={buildingsQuery.data ?? []} isPending={updateMutation.isPending} serverError={serverError} onSubmit={async (values) => { await (updateMutation.mutateAsync as any)({ id: editRow.id, input: values }); }} onCancel={() => { setEditRow(null); setServerError(null); }} />
              ) : (
                <EntityForm config={floorConfig} mode="create" buildings={buildingsQuery.data ?? []} isPending={createMutation.isPending} serverError={serverError} onSubmit={async (values) => { await (createMutation.mutateAsync as any)(values); }} onCancel={() => { setFormOpen(false); setServerError(null); }} />
              )}
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-lg border border-[#d0e4ff] bg-white shadow-[0_1px_3px_0_rgba(11,25,44,0.04)] overflow-hidden">
        <div className="border-b border-[#d0e4ff] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
            Floor List
          </h2>
          <p className="mt-1 text-sm text-[#40484f]">All floors across buildings</p>
        </div>
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
    </div>
  );
}
