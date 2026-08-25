import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema, type LoginInput } from "@office/validation";
import { Button, Input } from "@office/ui";
import { api, ApiError } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) });

  async function onSubmit(data: LoginInput) {
    setServerError(null);
    try {
      await api.post("/api/auth/login", data);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      navigate("/");
    } catch (e) {
      if (e instanceof ApiError) {
        setServerError("Invalid email or password.");
      } else {
        setServerError("Something went wrong.");
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-sm"
      >
        <h1 className="mb-1 text-xl font-bold text-primary">SimplePlan Office</h1>
        <p className="mb-6 text-sm text-text-muted">Sign in to continue</p>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Email</label>
          <Input type="email" {...register("email")} />
          {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
        </div>
        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium">Password</label>
          <Input type="password" {...register("password")} />
          {errors.password && <p className="mt-1 text-xs text-danger">{errors.password.message}</p>}
        </div>
        {serverError && <p className="mb-4 text-sm text-danger">{serverError}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
