import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "./api";
import { useAuthStore } from "../store/authStore";
import type { AuthUser } from "@office/shared";

export function useCurrentUser() {
  const setUser = useAuthStore((s) => s.setUser);
  const query = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<{ user: AuthUser }>("/api/auth/me"),
    retry: false,
  });

  useEffect(() => {
    setUser(query.data?.user ?? null);
  }, [query.data, setUser]);

  return query;
}
