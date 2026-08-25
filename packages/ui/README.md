# @office/ui

Shared design tokens and base components for web + desktop.

## Theme

All colors live as CSS variables in `src/theme.css` (`--color-primary`,
`--color-background`, `--color-surface`, `--color-text`, `--color-border`,
`--color-success/warning/danger/info`). Light is the `:root` default; dark is
provided both via `prefers-color-scheme` and an explicit `[data-theme="dark"]`
override so a manual theme toggle (see `apps/web` Zustand store) can win over
the OS setting.

SimplePlan Media's live brand site could not be reviewed while building this
phase, so the palette is a bold indigo/violet-on-neutral placeholder chosen to
read as modern and professional. Swap the values in `theme.css` when the real
brand palette is available — nothing else in the codebase should hardcode
colors.

## Components

`Button`, `Input`, `Modal`, `Table`, `Badge`, `Avatar`, `StatCard` — all styled
purely from the CSS variables above.
