import sanitizeHtml from "sanitize-html";
import { isRichText } from "@office/shared";

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "em", "h2", "h3", "ul", "ol", "li", "blockquote", "a"],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesAppliedToAttributes: ["href"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
  },
};

/**
 * Cleans a rich-text description before it is stored.
 * - undefined: left alone (field not sent)
 * - blank, or rich text with no visible text (e.g. "<p></p>"): null, which clears it
 * - rich text: sanitised down to the editor's allowed tags
 * - anything else: kept as plain text (it is escaped when displayed)
 */
export function cleanDescription(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!isRichText(trimmed)) return trimmed;
  const clean = sanitizeHtml(trimmed, OPTIONS);
  const visibleText = sanitizeHtml(clean, { allowedTags: [], allowedAttributes: {} }).trim();
  return visibleText ? clean : null;
}
