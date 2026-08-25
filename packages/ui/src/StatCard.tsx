import { ReactNode } from "react";

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}

export function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="op-stat-card">
      {icon && <div className="op-stat-card__icon">{icon}</div>}
      <div>
        <div className="op-stat-card__value">{value}</div>
        <div className="op-stat-card__label">{label}</div>
      </div>
    </div>
  );
}
