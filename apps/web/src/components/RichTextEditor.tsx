import { useEffect, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";
import { toRichHtml } from "@office/shared";
import { Button, Input } from "@office/ui";

interface RichTextEditorProps {
  /** HTML (or older plain text). An empty string means empty. */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

/** Only web and mail links are allowed; a bare address like "example.com" becomes https. */
function normalizeUrl(input: string): string | null {
  const url = input.trim();
  if (!url) return null;
  if (/^(https?:|mailto:)/i.test(url)) return url;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return null;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) return `mailto:${url}`;
  return `https://${url}`;
}

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="op-rte__btn"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      // Keep the text selection: clicking a button must not blur the editor.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ value, onChange, placeholder, ariaLabel = "Description" }: RichTextEditorProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // Keep the feature set small so it matches what the server allows.
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        // Tiptap keeps an empty paragraph at the end by default, which would be saved as blank space.
        trailingNode: false,
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
        },
      }),
    ],
    content: value ? toRichHtml(value) : "",
    editorProps: {
      attributes: {
        class: "op-richtext",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": ariaLabel,
        "data-placeholder": placeholder ?? "",
      },
    },
    onUpdate: ({ editor: ed }) => onChange(ed.isEmpty ? "" : ed.getHTML()),
  });

  // Follow outside changes (for example the form being cleared after saving).
  useEffect(() => {
    if (!editor) return;
    const wanted = value ? toRichHtml(value) : "";
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (current !== wanted) editor.commands.setContent(wanted, { emitUpdate: false });
  }, [value, editor]);

  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      h2: ed?.isActive("heading", { level: 2 }) ?? false,
      h3: ed?.isActive("heading", { level: 3 }) ?? false,
      bold: ed?.isActive("bold") ?? false,
      italic: ed?.isActive("italic") ?? false,
      bullet: ed?.isActive("bulletList") ?? false,
      ordered: ed?.isActive("orderedList") ?? false,
      quote: ed?.isActive("blockquote") ?? false,
      link: ed?.isActive("link") ?? false,
      canUndo: ed?.can().undo() ?? false,
      canRedo: ed?.can().redo() ?? false,
    }),
  });

  if (!editor || !state) return null;

  function openLink() {
    const existing = editor!.getAttributes("link").href as string | undefined;
    setLinkUrl(existing ?? "");
    setLinkError(false);
    setLinkOpen(true);
  }

  function applyLink() {
    const href = normalizeUrl(linkUrl);
    if (!href) {
      setLinkError(true);
      return;
    }
    const chain = editor!.chain().focus();
    if (editor!.state.selection.empty && !editor!.isActive("link")) {
      // Nothing selected: insert the address itself as the link text.
      chain.insertContent({ type: "text", text: href.replace(/^mailto:/, ""), marks: [{ type: "link", attrs: { href } }] }).run();
    } else {
      chain.extendMarkRange("link").setLink({ href }).run();
    }
    setLinkOpen(false);
  }

  function removeLink() {
    editor!.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
  }

  const run = () => editor.chain().focus();

  return (
    <div className="op-rte">
      <div className="op-rte__toolbar" role="toolbar" aria-label="Formatting">
        <ToolbarButton label="Heading" active={state.h2} onClick={() => run().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton label="Subheading" active={state.h3} onClick={() => run().toggleHeading({ level: 3 }).run()}>
          <Heading3 size={16} />
        </ToolbarButton>
        <span className="op-rte__sep" aria-hidden="true" />
        <ToolbarButton label="Bold" active={state.bold} onClick={() => run().toggleBold().run()}>
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton label="Italic" active={state.italic} onClick={() => run().toggleItalic().run()}>
          <Italic size={16} />
        </ToolbarButton>
        <span className="op-rte__sep" aria-hidden="true" />
        <ToolbarButton label="Bulleted list" active={state.bullet} onClick={() => run().toggleBulletList().run()}>
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" active={state.ordered} onClick={() => run().toggleOrderedList().run()}>
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton label="Quote" active={state.quote} onClick={() => run().toggleBlockquote().run()}>
          <Quote size={16} />
        </ToolbarButton>
        <span className="op-rte__sep" aria-hidden="true" />
        <ToolbarButton label="Link" active={state.link || linkOpen} onClick={() => (linkOpen ? setLinkOpen(false) : openLink())}>
          <Link2 size={16} />
        </ToolbarButton>
        <span className="op-rte__sep" aria-hidden="true" />
        <ToolbarButton label="Undo" disabled={!state.canUndo} onClick={() => run().undo().run()}>
          <Undo2 size={16} />
        </ToolbarButton>
        <ToolbarButton label="Redo" disabled={!state.canRedo} onClick={() => run().redo().run()}>
          <Redo2 size={16} />
        </ToolbarButton>
      </div>

      {linkOpen && (
        <div className="op-rte__link">
          <Input
            autoFocus
            type="text"
            aria-label="Link address"
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(e) => {
              setLinkUrl(e.target.value);
              setLinkError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              } else if (e.key === "Escape") {
                e.stopPropagation();
                setLinkOpen(false);
              }
            }}
          />
          <Button type="button" onClick={applyLink}>
            Apply
          </Button>
          {state.link && (
            <Button type="button" variant="secondary" onClick={removeLink}>
              Remove link
            </Button>
          )}
          {linkError && <p className="w-full text-xs text-danger">Enter a web address (https://...) or an email address.</p>}
        </div>
      )}

      <EditorContent editor={editor} className="op-rte__content" />
    </div>
  );
}
