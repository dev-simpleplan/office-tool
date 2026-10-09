import { describe, it, expect } from "vitest";
import { isRichText, toRichHtml } from "@office/shared";
import { cleanDescription } from "../richText.js";

describe("cleanDescription", () => {
  it("leaves undefined alone and clears blank or empty-editor values", () => {
    expect(cleanDescription(undefined)).toBeUndefined();
    expect(cleanDescription("")).toBeNull();
    expect(cleanDescription("   \n ")).toBeNull();
    expect(cleanDescription("<p></p>")).toBeNull();
    expect(cleanDescription("<p> </p><p><br></p>")).toBeNull();
  });

  it("keeps everything the editor can produce", () => {
    const html =
      '<h2>Plan</h2><h3>Detail</h3><p>Did <strong>bold</strong> and <em>italic</em> work<br />next line</p>' +
      "<ul><li><p>one</p></li><li><p>two</p></li></ul><ol><li><p>a</p></li></ol><blockquote><p>quoted</p></blockquote>";
    expect(cleanDescription(html)).toBe(html);
  });

  it("strips scripts, event handlers, styles and other tags", () => {
    const out = cleanDescription(
      '<p onclick="alert(1)" style="color:red">hi</p><script>alert(1)</script><img src=x onerror=alert(1)><iframe src="https://evil"></iframe><h1>big</h1>'
    )!;
    expect(out).not.toMatch(/script|onclick|onerror|iframe|<img|style=|<h1/i);
    expect(out).toContain("<p>hi</p>");
  });

  it("blocks javascript: and data: links but keeps http, https and mailto", () => {
    const out = cleanDescription(
      '<p><a href="javascript:alert(1)">bad</a> <a href="data:text/html,x">bad2</a> <a href="https://ok.example/path">ok</a> <a href="mailto:a@b.co">mail</a></p>'
    )!;
    expect(out).not.toMatch(/javascript:|data:/i);
    expect(out).toContain('href="https://ok.example/path"');
    expect(out).toContain('href="mailto:a@b.co"');
  });

  it("forces links to open in a new tab without leaking the opener", () => {
    const out = cleanDescription('<p><a href="https://ok.example" target="_self" rel="opener">x</a></p>')!;
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).not.toContain('rel="opener"');
  });

  it("treats text that does not start with an editor tag as plain text", () => {
    expect(isRichText("worked on this")).toBe(false);
    expect(isRichText("<script>alert(1)</script>")).toBe(false);
    expect(cleanDescription("Tom & Jerry")).toBe("Tom & Jerry");
    // stays inert when shown: it is escaped, not parsed
    expect(toRichHtml("<script>alert(1)</script>")).toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
  });
});

describe("toRichHtml", () => {
  it("turns old plain-text entries into paragraphs, keeping line breaks", () => {
    expect(toRichHtml("first\nsecond\n\nnew paragraph")).toBe("<p>first<br>second</p><p>new paragraph</p>");
  });
  it("passes editor HTML through unchanged", () => {
    expect(toRichHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });
});
