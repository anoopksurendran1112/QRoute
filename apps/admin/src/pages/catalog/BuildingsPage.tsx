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
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
            Buildings
          </h1>
          <p className="mt-1 text-sm text-[#40484f]">Create, edit and delete buildings.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditRow(null);
            setServerError(null);
            setFormOpen(true);
          }}
          className="rounded-md bg-[#006699] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#004b72] focus:outline-none focus:ring-2 focus:ring-[#006699]/30"
        >
          + New building
        </button>
      </header>

      {/* Create/Edit Modal */}
      {(formOpen && !editRow) || editRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#d0e4ff] px-6 py-4">
              <h2 className="text-lg font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
                {editRow ? "Edit building" : "New building"}
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
              ) : (
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
              )}
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-lg border border-[#d0e4ff] bg-white shadow-[0_1px_3px_0_rgba(11,25,44,0.04)] overflow-hidden">
        <div className="border-b border-[#d0e4ff] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
            Building List
          </h2>
          <p className="mt-1 text-sm text-[#40484f]">All buildings in the campus</p>
        </div>
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
    </div>
  );
}
