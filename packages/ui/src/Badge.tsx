import { PropsWithChildren } from "react";
import clsx from "clsx";

export interface BadgeProps extends PropsWithChildren {
  variant?: "success" | "warning" | "danger" | "info" | "default";
}

export function Badge({ variant = "default", children }: BadgeProps) {
  return <span className={clsx("op-badge", `op-badge--${variant}`)}>{children}</span>;
}
