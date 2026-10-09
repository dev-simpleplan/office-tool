import DOMPurify from "dompurify";

const ALLOWED_TAGS = ["p", "br", "strong", "em", "h2", "h3", "ul", "ol", "li", "blockquote", "a"];

DOMPurify.removeHooks("afterSanitizeAttributes");
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

/** Final safety net before rich text is put on the page. */
export function sanitizeRichHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
  });
}
