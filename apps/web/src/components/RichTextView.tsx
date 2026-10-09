import { toRichHtml } from "@office/shared";
import { sanitizeRichHtml } from "../lib/sanitizeHtml";

/** Read-only display of a rich text value. Older plain-text values are shown as paragraphs. */
export function RichTextView({ value, className = "" }: { value: string; className?: string }) {
  return (
    <div
      className={`op-richtext ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(toRichHtml(value)) }}
    />
  );
}
