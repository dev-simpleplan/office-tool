import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateWorkScheduleSchema, type CreateWorkScheduleInput } from "@office/validation";
import { Button, Input, Table, Badge, ConfirmDialog } from "@office/ui";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import type { WorkScheduleSummary } from "@office/shared";
import { useState } from "react";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEFAULT_DAYS = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  isWorkingDay: dayOfWeek >= 1 && dayOfWeek <= 5,
  startTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "09:00" : "",
  endTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "18:00" : "",
  breakMinutes: dayOfWeek >= 1 && dayOfWeek <= 5 ? 60 : 0,
}));

export function SchedulesPage() {
  const user = useAuthStore((s) => s.user);
  const canCreate = user?.permissions.includes("schedules.create");
  const canUpdate = user?.permissions.includes("schedules.update");
  const canArchive = user?.permissions.includes("schedules.archive");
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkScheduleSummary | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<WorkScheduleSummary | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => api.get<{ schedules: WorkScheduleSummary[] }>("/api/schedules"),
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateWorkScheduleInput>({
    resolver: zodResolver(CreateWorkScheduleSchema),
    defaultValues: { name: "", days: DEFAULT_DAYS },
  });
  const { fields } = useFieldArray({ control, name: "days" });

  function closeForm() {
    reset({ name: "", days: DEFAULT_DAYS });
    setShowForm(false);
    setEditingSchedule(null);
  }

  function openCreateForm() {
    reset({ name: "", days: DEFAULT_DAYS });
    setEditingSchedule(null);
    setShowForm(true);
  }

  function openEditForm(schedule: WorkScheduleSummary) {
    reset({
      name: schedule.name,
      days: DAY_LABELS.map((_, dayOfWeek) => {
        const existing = schedule.days.find((d) => d.dayOfWeek === dayOfWeek);
        return {
          dayOfWeek,
          isWorkingDay: existing?.isWorkingDay ?? false,
          startTime: existing?.startTime ?? "",
          endTime: existing?.endTime ?? "",
          breakMinutes: existing?.breakMinutes ?? 0,
        };
      }),
    });
    setEditingSchedule(schedule);
    setShowForm(true);
  }

  const createMutation = useMutation({
    mutationFn: (input: CreateWorkScheduleInput) => api.post("/api/schedules", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: CreateWorkScheduleInput) =>
      api.patch(`/api/schedules/${editingSchedule!.id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      closeForm();
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/schedules/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setArchiveTarget(null);
    },
  });

  const activeMutation = editingSchedule ? updateMutation : createMutation;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Work Schedules</h1>
        {canCreate && (
          <Button onClick={() => (showForm ? closeForm() : openCreateForm())}>
            {showForm ? "Cancel" : "Add Schedule"}
          </Button>
        )}
      </div>

      {showForm && (canCreate || canUpdate) && (
        <form
          onSubmit={handleSubmit((formData) => activeMutation.mutate(formData))}
          className="mb-6 rounded-lg border border-border bg-surface p-6"
        >
          {editingSchedule && (
            <p className="mb-4 text-sm text-text-muted">Editing "{editingSchedule.name}"</p>
          )}
          <div className="mb-4 max-w-sm">
            <label className="mb-1 block text-sm font-medium">Name</label>
            <Input {...register("name")} />
            {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
          </div>

          <div className="min-w-0 overflow-x-auto">
            <table className="op-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Working</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Break (min)</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => (
                  <tr key={field.id}>
                    <td>{DAY_LABELS[index]}</td>
                    <td>
                      <input type="checkbox" {...register(`days.${index}.isWorkingDay`)} />
                    </td>
                    <td>
                      <Input type="time" {...register(`days.${index}.startTime`)} />
                    </td>
                    <td>
                      <Input type="time" {...register(`days.${index}.endTime`)} />
                    </td>
                    <td>
                      <Input
                        type="number"
                        className="w-20"
                        {...register(`days.${index}.breakMinutes`, { valueAsNumber: true })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting || activeMutation.isPending}>
              {activeMutation.isPending ? "Saving..." : editingSchedule ? "Update Schedule" : "Save Schedule"}
            </Button>
            {editingSchedule && (
              <Button type="button" variant="secondary" onClick={closeForm}>
                Cancel Edit
              </Button>
            )}
            {activeMutation.isError && (
              <p className="text-sm text-danger">Failed to save schedule.</p>
            )}
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-text-muted">Loading...</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Working Days</th>
              <th>Status</th>
              {(canUpdate || canArchive) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data?.schedules.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>
                  {s.days
                    .filter((d) => d.isWorkingDay)
                    .map((d) => DAY_LABELS[d.dayOfWeek])
                    .join(", ") || "None"}
                </td>
                <td>
                  <Badge variant={s.status === "ACTIVE" ? "success" : "warning"}>{s.status}</Badge>
                </td>
                {(canUpdate || canArchive) && (
                  <td>
                    {s.status === "ACTIVE" && (
                      <div className="flex gap-2">
                        {canUpdate && (
                          <Button variant="ghost" onClick={() => openEditForm(s)}>
                            Edit
                          </Button>
                        )}
                        {canArchive && (
                          <Button variant="ghost" onClick={() => setArchiveTarget(s)}>
                            Archive
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <ConfirmDialog
        open={!!archiveTarget}
        title="Archive Schedule"
        description={`Are you sure you want to archive "${archiveTarget?.name}"? It will no longer be assignable to employees.`}
        confirmLabel="Archive"
        pending={archiveMutation.isPending}
        onConfirm={() => archiveTarget && archiveMutation.mutate(archiveTarget.id)}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
