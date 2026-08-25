import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateWorkScheduleSchema, type CreateWorkScheduleInput } from "@office/validation";
import { Button, Input, Table } from "@office/ui";
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
  const [showForm, setShowForm] = useState(false);
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

  const createMutation = useMutation({
    mutationFn: (input: CreateWorkScheduleInput) => api.post("/api/schedules", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      reset({ name: "", days: DEFAULT_DAYS });
      setShowForm(false);
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Work Schedules</h1>
        {canCreate && (
          <Button onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "Add Schedule"}
          </Button>
        )}
      </div>

      {showForm && canCreate && (
        <form
          onSubmit={handleSubmit((data) => createMutation.mutate(data))}
          className="mb-6 rounded-lg border border-border bg-surface p-6"
        >
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

          <div className="mt-4">
            <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Save Schedule"}
            </Button>
            {createMutation.isError && (
              <p className="mt-2 text-sm text-danger">Failed to create schedule.</p>
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
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
