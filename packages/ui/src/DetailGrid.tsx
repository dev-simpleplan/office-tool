import { PropsWithChildren, ReactNode } from "react";
import clsx from "clsx";

export function DetailGrid({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <dl className={clsx("op-detail-grid", className)}>{children}</dl>;
}

export interface DetailItemProps {
  label: string;
  /** Renders a muted dash when empty (null, undefined, or ""). */
  children?: ReactNode;
  /** Stretch across every column, e.g. for long descriptions. */
  full?: boolean;
}

export function DetailItem({ label, children, full }: DetailItemProps) {
  const empty = children === null || children === undefined || children === "";
  return (
    <div className={clsx("op-detail-item", full && "op-detail-item--full")}>
      <dt className="op-detail-item__label">{label}</dt>
      <dd className={clsx("op-detail-item__value", empty && "op-detail-item__value--empty")}>
        {empty ? "—" : children}
      </dd>
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className="op-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div className="op-progress__bar" style={{ width: `${pct}%` }} />
    </div>
  );
}
