import { TextareaHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 4, ...props }, ref) => {
    return <textarea ref={ref} rows={rows} className={clsx("op-input", className)} {...props} />;
  },
);
Textarea.displayName = "Textarea";
