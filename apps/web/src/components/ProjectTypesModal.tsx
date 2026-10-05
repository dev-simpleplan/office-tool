import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Modal } from "@office/ui";
import type { ProjectTypeSummary } from "@office/shared";
import { api, ApiError } from "../lib/api";
import { useAuthStore } from "../store/authStore";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError && (err.body as { error?: string } | null)?.error === "project_type_exists") {
    return "A project type with that name already exists.";
  }
  return "Something went wrong. Please try again.";
}

export function ProjectTypesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  const canCreate = permissions.includes("projects.create");
  const canRename = permissions.includes("projects.update");
  const canDelete = permissions.includes("projects.delete");
  const queryClient = useQueryClient();

  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["project-types"],
    queryFn: () => api.get<{ projectTypes: ProjectTypeSummary[] }>("/api/project-types"),
    enabled: open,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["project-types"] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  }

  const addMutation = useMutation({
    mutationFn: (name: string) => api.post("/api/project-types", { name }),
    onSuccess: () => {
      setNewName("");
      setError(null);
      refresh();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.patch(`/api/project-types/${id}`, { name }),
    onSuccess: () => {
      setRenamingId(null);
      setError(null);
      refresh();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/project-types/${id}`),
    onSuccess: () => {
      setDeletingId(null);
      setError(null);
      refresh();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const types = data?.projectTypes ?? [];

  return (
    <Modal open={open} onClose={onClose} title="Project Types">
      <div className="space-y-4">
        {canCreate && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (newName.trim()) addMutation.mutate(newName.trim());
            }}
          >
            <Input
              aria-label="New project type name"
              placeholder="New type, e.g. Internal Tool"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Button type="submit" disabled={!newName.trim() || addMutation.isPending}>
              {addMutation.isPending ? "Adding..." : "Add"}
            </Button>
          </form>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}

        <ul className="space-y-2">
          {types.map((t) => (
            <li key={t.id} className="rounded-md border border-border px-3 py-2.5">
              {renamingId === t.id ? (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (renameValue.trim()) renameMutation.mutate({ id: t.id, name: renameValue.trim() });
                  }}
                >
                  <Input
                    aria-label={`Rename ${t.name}`}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                  />
                  <Button type="submit" disabled={!renameValue.trim() || renameMutation.isPending}>
                    Save
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setRenamingId(null)}>
                    Cancel
                  </Button>
                </form>
              ) : deletingId === t.id ? (
                <div className="space-y-2">
                  <p className="text-sm text-danger">
                    <strong>Warning:</strong> Delete &ldquo;{t.name}&rdquo;?{" "}
                    {t.projectCount > 0
                      ? `${t.projectCount} project${t.projectCount === 1 ? "" : "s"} will be left without a type.`
                      : "No projects use it."}{" "}
                    This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(t.id)}>
                      {deleteMutation.isPending ? "Deleting..." : "Delete"}
                    </Button>
                    <Button variant="secondary" onClick={() => setDeletingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-medium">{t.name}</span>{" "}
                    <span className="text-xs text-text-muted">
                      {t.projectCount} project{t.projectCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {canRename && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setError(null);
                          setDeletingId(null);
                          setRenamingId(t.id);
                          setRenameValue(t.name);
                        }}
                      >
                        Rename
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        className="text-danger"
                        onClick={() => {
                          setError(null);
                          setRenamingId(null);
                          setDeletingId(t.id);
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
          {types.length === 0 && <p className="text-sm text-text-muted">No project types yet.</p>}
        </ul>

        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
