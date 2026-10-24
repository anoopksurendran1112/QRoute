import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../../api/client.ts";
import { createClassroom, deleteClassroom, listClassrooms, listDepartments, listFloors, updateClassroom, type ClassroomDto } from "../../api/catalog.ts";
import { ConfirmDelete } from "../../components/catalog/ConfirmDelete.tsx";
import { EntityForm } from "../../components/catalog/EntityForm.tsx";
import { EntityTable } from "../../components/catalog/EntityTable.tsx";
import { classroomConfig } from "../../components/catalog/entityConfig.ts";

export function ClassroomsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<ClassroomDto | null>(null);
  const [deleteRow, setDeleteRow] = useState<ClassroomDto | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const listQuery = useQuery({ queryKey: ["classrooms"], queryFn: () => listClassrooms() });
  const floorsQuery = useQuery({ queryKey: ["floors"], queryFn: () => listFloors() });
  const departmentsQuery = useQuery({ queryKey: ["departments"], queryFn: listDepartments });

  const createMutation = useMutation({
    mutationFn: createClassroom,
    onSuccess: async () => {
      setServerError(null);
      setFormOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["classrooms"] });
    },
    onError: (error) => { setServerError(error instanceof ApiError ? error.message : "Failed to create classroom"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) => updateClassroom(id, input),
    onSuccess: async () => {
      setServerError(null);
      setEditRow(null);
      await queryClient.invalidateQueries({ queryKey: ["classrooms"] });
    },
    onError: (error) => { setServerError(error instanceof ApiError ? error.message : "Failed to update classroom"); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClassroom,
    onSuccess: async () => {
      setDeleteError(null);
      setDeleteRow(null);
      await queryClient.invalidateQueries({ queryKey: ["classrooms"] });
    },
    onError: (error) => { setDeleteError(error instanceof ApiError ? error.message : "Failed to delete classroom"); },
  });

  const rows = (listQuery.data ?? []).map((row) => ({
    ...row,
    floor: row.floor?.name ?? `Level ${row.floor?.level ?? "-"}`,
    department: row.department?.name ?? "-",
    entranceNodeId: row.entranceNodeId ?? null,
  }));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Classrooms</h1>
            <p className="mt-1 text-sm text-slate-600">Track rooms and whether an entrance node is bound.</p>
          </div>
          <button type="button" onClick={() => { setEditRow(null); setServerError(null); setFormOpen(true); }} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            New classroom
          </button>
        </header>

        {formOpen && !editRow ? (
          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-medium text-slate-900">New classroom</h2>
            <div className="mt-4">
              <EntityForm config={classroomConfig} mode="create" floors={floorsQuery.data ?? []} departments={departmentsQuery.data ?? []} isPending={createMutation.isPending} serverError={serverError} onSubmit={async (values) => { await createMutation.mutateAsync(values as any); }} onCancel={() => { setFormOpen(false); setServerError(null); }} />
            </div>
          </section>
        ) : null}

        {editRow ? (
          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-medium text-slate-900">Edit classroom</h2>
            <div className="mt-4">
              <EntityForm config={classroomConfig} mode="edit" initialValues={{ roomNumber: editRow.roomNumber, floorId: editRow.floorId, departmentId: editRow.departmentId ?? "", entranceNodeId: editRow.entranceNodeId ?? "", name: editRow.name ?? "", capacity: editRow.capacity ?? "" }} floors={floorsQuery.data ?? []} departments={departmentsQuery.data ?? []} isPending={updateMutation.isPending} serverError={serverError} onSubmit={async (values) => { await updateMutation.mutateAsync({ id: editRow.id, input: values as any }); }} onCancel={() => { setEditRow(null); setServerError(null); }} />
            </div>
          </section>
        ) : null}

        <section className="mt-6">
          <EntityTable config={classroomConfig} rows={rows} isLoading={listQuery.isLoading} onEdit={(row) => { setEditRow(row as unknown as ClassroomDto); setFormOpen(false); setServerError(null); }} onDelete={(row) => { setDeleteRow(row as unknown as ClassroomDto); setDeleteError(null); }} />
        </section>
      </div>

      <ConfirmDelete open={deleteRow !== null} recordLabel={deleteRow ? `Room ${deleteRow.roomNumber}` : ""} isPending={deleteMutation.isPending} error={deleteError} onConfirm={() => { if (deleteRow) deleteMutation.mutate(deleteRow.id); }} onCancel={() => { setDeleteRow(null); setDeleteError(null); }} />
    </main>
  );
}
