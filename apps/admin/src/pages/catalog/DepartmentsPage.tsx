import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../../api/client.ts";
import { createDepartment, deleteDepartment, listDepartments, updateDepartment, type DepartmentDto } from "../../api/catalog.ts";
import { ConfirmDelete } from "../../components/catalog/ConfirmDelete.tsx";
import { EntityForm } from "../../components/catalog/EntityForm.tsx";
import { EntityTable } from "../../components/catalog/EntityTable.tsx";
import { departmentConfig } from "../../components/catalog/entityConfig.ts";

export function DepartmentsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<DepartmentDto | null>(null);
  const [deleteRow, setDeleteRow] = useState<DepartmentDto | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const listQuery = useQuery({ queryKey: ["departments"], queryFn: listDepartments });

  const createMutation = useMutation({
    mutationFn: createDepartment,
    onSuccess: async () => { setServerError(null); setFormOpen(false); await queryClient.invalidateQueries({ queryKey: ["departments"] }); },
    onError: (error) => { setServerError(error instanceof ApiError ? error.message : "Failed to create department"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) => updateDepartment(id, input),
    onSuccess: async () => { setServerError(null); setEditRow(null); await queryClient.invalidateQueries({ queryKey: ["departments"] }); },
    onError: (error) => { setServerError(error instanceof ApiError ? error.message : "Failed to update department"); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: async () => { setDeleteError(null); setDeleteRow(null); await queryClient.invalidateQueries({ queryKey: ["departments"] }); },
    onError: (error) => { setDeleteError(error instanceof ApiError ? error.message : "Failed to delete department"); },
  });

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
            Departments
          </h1>
          <p className="mt-1 text-sm text-[#40484f]">Manage departments and linked faculty/classrooms.</p>
        </div>
        <button
          type="button"
          onClick={() => { setEditRow(null); setServerError(null); setFormOpen(true); }}
          className="rounded-md bg-[#006699] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#004b72] focus:outline-none focus:ring-2 focus:ring-[#006699]/30"
        >
          + New department
        </button>
      </header>

      {(formOpen && !editRow) || editRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#d0e4ff] px-6 py-4">
              <h2 className="text-lg font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
                {editRow ? "Edit department" : "New department"}
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
                <EntityForm config={departmentConfig} mode="edit" initialValues={editRow as any} isPending={updateMutation.isPending} serverError={serverError} onSubmit={async (values) => { await updateMutation.mutateAsync({ id: editRow.id, input: values as any }); }} onCancel={() => { setEditRow(null); setServerError(null); }} />
              ) : (
                <EntityForm config={departmentConfig} mode="create" isPending={createMutation.isPending} serverError={serverError} onSubmit={async (values) => { await createMutation.mutateAsync(values as any); }} onCancel={() => { setFormOpen(false); setServerError(null); }} />
              )}
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-lg border border-[#d0e4ff] bg-white shadow-[0_1px_3px_0_rgba(11,25,44,0.04)] overflow-hidden">
        <div className="border-b border-[#d0e4ff] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
            Department List
          </h2>
          <p className="mt-1 text-sm text-[#40484f]">All departments in the campus</p>
        </div>
        <EntityTable config={departmentConfig} rows={(listQuery.data ?? []) as any} isLoading={listQuery.isLoading} onEdit={(row) => { setEditRow(row as unknown as DepartmentDto); setFormOpen(false); setServerError(null); }} onDelete={(row) => { setDeleteRow(row as unknown as DepartmentDto); setDeleteError(null); }} />
      </section>

      <ConfirmDelete open={deleteRow !== null} recordLabel={deleteRow ? `${deleteRow.code} — ${deleteRow.name}` : ""} isPending={deleteMutation.isPending} error={deleteError} onConfirm={() => { if (deleteRow) deleteMutation.mutate(deleteRow.id); }} onCancel={() => { setDeleteRow(null); setDeleteError(null); }} />
    </div>
  );
}
