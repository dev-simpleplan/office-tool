import { PropsWithChildren } from "react";

export function Table({ children }: PropsWithChildren) {
  return (
    <div className="op-table-wrap">
      <table className="op-table">{children}</table>
    </div>
  );
}
