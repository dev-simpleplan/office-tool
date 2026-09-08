import { PropsWithChildren, useEffect, useRef } from "react";

export interface ModalProps extends PropsWithChildren {
  open: boolean;
  onClose: () => void;
  title?: string;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`op-modal-title-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Prefer an element that already wants focus (e.g. a search input with
    // autoFocus) over the panel itself — grabbing the panel unconditionally
    // would steal focus away from it a tick after mount.
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    (firstFocusable ?? panelRef.current)?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="op-modal-overlay" onClick={onClose}>
      <div
        className="op-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId.current : undefined}
        tabIndex={-1}
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 id={titleId.current} className="op-modal-title">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
