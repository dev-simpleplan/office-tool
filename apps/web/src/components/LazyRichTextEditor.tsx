import { lazy, Suspense } from "react";

// The editor library is large and only the task page needs it, so load it on demand.
const RichTextEditor = lazy(() => import("./RichTextEditor").then((m) => ({ default: m.RichTextEditor })));

type Props = Parameters<typeof import("./RichTextEditor").RichTextEditor>[0];

export function LazyRichTextEditor(props: Props) {
  return (
    <Suspense
      fallback={<div className="op-rte" style={{ minHeight: "13rem" }} aria-busy="true" aria-label="Loading editor" />}
    >
      <RichTextEditor {...props} />
    </Suspense>
  );
}
