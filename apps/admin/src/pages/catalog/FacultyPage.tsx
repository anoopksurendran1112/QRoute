import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../../api/client.ts";
import { createFaculty, deleteFaculty, listDepartments, listFaculty, updateFaculty, type FacultyDto } from "../../api/catalog.ts";
import { ConfirmDelete } from "../../components/catalog/ConfirmDelete.tsx";
import { EntityForm } from "../../components/catalog/EntityForm.tsx";
import { EntityTable } from "../../components/catalog/EntityTable.tsx";
import { facultyConfig } from "../../components/catalog/entityConfig.ts";

export function FacultyPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<FacultyDto | null>(null);
  const [deleteRow, setDeleteRow] = useState<FacultyDto | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const listQuery = useQuery({ queryKey: ["faculty"], queryFn: () => listFaculty() });
  const departmentsQuery = useQuery({ queryKey: ["departments"], queryFn: listDepartments });

  const createMutation = useMutation({
    mutationFn: createFaculty,
    onSuccess: async () => { setServerError(null); setFormOpen(false); await queryClient.invalidateQueries({ queryKey: ["faculty"] }); },
    onError: (error) => { setServerError(error instanceof ApiError ? error.message : "Failed to create faculty"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) => updateFaculty(id, input),
    onSuccess: async () => { setServerError(null); setEditRow(null); await queryClient.invalidateQueries({ queryKey: ["faculty"] }); },
    onError: (error) => { setServerError(error instanceof ApiError ? error.message : "Failed to update faculty"); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFaculty,
    onSuccess: async () => { setDeleteError(null); setDeleteRow(null); await queryClient.invalidateQueries({ queryKey: ["faculty"] }); },
    onError: (error) => { setDeleteError(error instanceof ApiError ? error.message : "Failed to delete faculty"); },
  });

  const rows = (listQuery.data ?? []).map((row) => ({ ...row, department: row.department?.name ?? "-" }));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Faculty</h1>
            <p className="mt-1 text-sm text-slate-600">Manage faculty members.</p>
          </div>
          <button type="button" onClick={() => { setEditRow(null); setServerError(null); setFormOpen(true); }} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            New faculty
          </button>
        </header>

        {formOpen && !editRow ? (
          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-medium text-slate-900">New faculty</h2>
            <div className="mt-4">
              <EntityForm config={facultyConfig} mode="create" departments={departmentsQuery.data ?? []} isPending={createMutation.isPending} serverError={serverError} onSubmit={async (values) => { await createMutation.mutateAsync(values as any); }} onCancel={() => { setFormOpen(false); setServerError(null); }} />
            </div>
          </section>
        ) : null}

        {editRow ? (
          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-medium text-slate-900">Edit faculty</h2>
            <div className="mt-4">
              <EntityForm config={facultyConfig} mode="edit" initialValues={{ name: editRow.name, email: editRow.email, designation: editRow.designation ?? "", departmentId: editRow.departmentId }} departments={departmentsQuery.data ?? []} isPending={updateMutation.isPending} serverError={serverError} onSubmit={async (values) => { await updateMutation.mutateAsync({ id: editRow.id, input: values as any }); }} onCancel={() => { setEditRow(null); setServerError(null); }} />
            </div>
          </section>
        ) : null}

        <section className="mt-6">
          <EntityTable config={facultyConfig} rows={rows as any} isLoading={listQuery.isLoading} onEdit={(row) => { setEditRow(row as unknown as FacultyDto); setFormOpen(false); setServerError(null); }} onDelete={(row) => { setDeleteRow(row as unknown as FacultyDto); setDeleteError(null); }} />
        </section>
      </div>

      <ConfirmDelete open={deleteRow !== null} recordLabel={deleteRow ? deleteRow.name : ""} isPending={deleteMutation.isPending} error={deleteError} onConfirm={() => { if (deleteRow) deleteMutation.mutate(deleteRow.id); }} onCancel={() => { setDeleteRow(null); setDeleteError(null); }} />
    </main>
  );
}
