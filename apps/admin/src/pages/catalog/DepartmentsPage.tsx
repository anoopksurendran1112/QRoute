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
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Departments</h1>
            <p className="mt-1 text-sm text-slate-600">Manage departments and linked faculty/classrooms.</p>
          </div>
          <button type="button" onClick={() => { setEditRow(null); setServerError(null); setFormOpen(true); }} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            New department
          </button>
        </header>

        {formOpen && !editRow ? (
          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-medium text-slate-900">New department</h2>
            <div className="mt-4">
              <EntityForm config={departmentConfig} mode="create" isPending={createMutation.isPending} serverError={serverError} onSubmit={async (values) => { await createMutation.mutateAsync(values as any); }} onCancel={() => { setFormOpen(false); setServerError(null); }} />
            </div>
          </section>
        ) : null}

        {editRow ? (
          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-medium text-slate-900">Edit department</h2>
            <div className="mt-4">
              <EntityForm config={departmentConfig} mode="edit" initialValues={editRow as any} isPending={updateMutation.isPending} serverError={serverError} onSubmit={async (values) => { await updateMutation.mutateAsync({ id: editRow.id, input: values as any }); }} onCancel={() => { setEditRow(null); setServerError(null); }} />
            </div>
          </section>
        ) : null}

        <section className="mt-6">
          <EntityTable config={departmentConfig} rows={(listQuery.data ?? []) as any} isLoading={listQuery.isLoading} onEdit={(row) => { setEditRow(row as unknown as DepartmentDto); setFormOpen(false); setServerError(null); }} onDelete={(row) => { setDeleteRow(row as unknown as DepartmentDto); setDeleteError(null); }} />
        </section>
      </div>

      <ConfirmDelete open={deleteRow !== null} recordLabel={deleteRow ? `${deleteRow.code} — ${deleteRow.name}` : ""} isPending={deleteMutation.isPending} error={deleteError} onConfirm={() => { if (deleteRow) deleteMutation.mutate(deleteRow.id); }} onCancel={() => { setDeleteRow(null); setDeleteError(null); }} />
    </main>
  );
}
