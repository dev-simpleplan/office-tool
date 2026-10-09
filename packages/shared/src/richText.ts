/**
 * Rich text (work log descriptions) is stored as a small HTML subset produced
 * by the editor: p, br, strong, em, h2, h3, ul, ol, li, blockquote, a.
 * Older entries are plain text. A value counts as rich only when it starts with
 * one of the editor's block tags; anything else is treated as plain text and
 * escaped when displayed, so odd input can never turn into live markup.
 */
const RICH_START = /^\s*<(p|h[1-6]|ul|ol|blockquote)[\s>]/i;

export function isRichText(value: string): boolean {
  return RICH_START.test(value);
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Plain text to HTML: blank lines separate paragraphs, single line breaks become <br>. */
export function plainTextToHtml(text: string): string {
  return text
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((para) => `<p>${escapeHtml(para).replace(/\r?\n/g, "<br>")}</p>`)
    .join("");
}

/** HTML ready to hand to the editor or (after sanitising) to the page. */
export function toRichHtml(value: string): string {
  return isRichText(value) ? value : plainTextToHtml(value);
}
