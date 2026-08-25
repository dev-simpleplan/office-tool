import { PropsWithChildren } from "react";

export interface ModalProps extends PropsWithChildren {
  open: boolean;
  onClose: () => void;
  title?: string;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="op-modal-overlay" onClick={onClose}>
      <div className="op-modal" onClick={(e) => e.stopPropagation()}>
        {title && <h2 className="op-modal-title">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
