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
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
            Classrooms
          </h1>
          <p className="mt-1 text-sm text-[#40484f]">Track rooms and whether an entrance node is bound.</p>
        </div>
        <button
          type="button"
          onClick={() => { setEditRow(null); setServerError(null); setFormOpen(true); }}
          className="rounded-md bg-[#006699] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#004b72] focus:outline-none focus:ring-2 focus:ring-[#006699]/30"
        >
          + New classroom
        </button>
      </header>

      {(formOpen && !editRow) || editRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#d0e4ff] px-6 py-4 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
                {editRow ? "Edit classroom" : "New classroom"}
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
                <EntityForm config={classroomConfig} mode="edit" initialValues={{ roomNumber: editRow.roomNumber, floorId: editRow.floorId, departmentId: editRow.departmentId ?? "", entranceNodeId: editRow.entranceNodeId ?? "", name: editRow.name ?? "", capacity: editRow.capacity ?? "" }} floors={floorsQuery.data ?? []} departments={departmentsQuery.data ?? []} isPending={updateMutation.isPending} serverError={serverError} onSubmit={async (values) => { await updateMutation.mutateAsync({ id: editRow.id, input: values as any }); }} onCancel={() => { setEditRow(null); setServerError(null); }} />
              ) : (
                <EntityForm config={classroomConfig} mode="create" floors={floorsQuery.data ?? []} departments={departmentsQuery.data ?? []} isPending={createMutation.isPending} serverError={serverError} onSubmit={async (values) => { await createMutation.mutateAsync(values as any); }} onCancel={() => { setFormOpen(false); setServerError(null); }} />
              )}
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-lg border border-[#d0e4ff] bg-white shadow-[0_1px_3px_0_rgba(11,25,44,0.04)] overflow-hidden">
        <div className="border-b border-[#d0e4ff] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
            Classroom List
          </h2>
          <p className="mt-1 text-sm text-[#40484f]">All classrooms in the campus</p>
        </div>
        <EntityTable config={classroomConfig} rows={rows} isLoading={listQuery.isLoading} onEdit={(row) => { setEditRow(row as unknown as ClassroomDto); setFormOpen(false); setServerError(null); }} onDelete={(row) => { setDeleteRow(row as unknown as ClassroomDto); setDeleteError(null); }} />
      </section>

      <ConfirmDelete open={deleteRow !== null} recordLabel={deleteRow ? `Room ${deleteRow.roomNumber}` : ""} isPending={deleteMutation.isPending} error={deleteError} onConfirm={() => { if (deleteRow) deleteMutation.mutate(deleteRow.id); }} onCancel={() => { setDeleteRow(null); setDeleteError(null); }} />
    </div>
  );
}
