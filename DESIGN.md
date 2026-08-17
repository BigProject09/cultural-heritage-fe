# VORA Design System

## Atmosphere
VORA is a quiet conservation workspace: warm archival paper, measured editorial
type, thin material-like rules, and restrained shadows. Functional analysis
surfaces stay calm and leave the artifact images as the visual focus.

## Color
Use `vora-*` tokens from `src/index.css`, mirrored as `--heritage-*` on
workspace screens. Visual VCA defines its page-local `--workflow-*` aliases
from the same `--color-vora-*` values. `paper` / `surface` form the canvas,
`ink` and `muted` provide the reading hierarchy, `bronze` is the primary action
and metadata accent, `green` confirms completed work, and `danger` represents
destructive or failed operations. Guide blue is reserved for conservation-guide
screens, not visual-investigation actions.

## Typography
Body copy uses Pretendard with Noto Sans KR fallback. Display headings use Noto
Serif KR / Georgia at a medium weight with tight tracking. Eyebrows are
10--11px bold uppercase labels with wide tracking; operational body copy is
13--15px. Values in records should not be visually louder than the artifact
name.

## Spacing
The working rhythm is an 8px-derived scale: 8, 12, 16, 20, 24, 30, 40, and
48px. Desktop workspace content is centered within 1040--1240px and has
generous vertical page padding. At small widths cards stack and actions expand
to usable full-width controls.

## Components
Cards use `surface`, a subtle `line` border, 14--16px radius, and the workflow
shadow. Primary buttons are bronze, secondary buttons retain the paper surface
and line border, and status chips are compact rounded pills. Artifact summary
data is a bordered grid that becomes a single column on narrow screens. Upload
zones are bordered dashed surfaces with explicit keyboard-accessible controls.
Visual VCA run status uses a compact bordered status panel with one pill, a
bronze progress track, and metadata rows instead of a history list when the user
needs to watch a single active analysis.

## Motion
Only short 160--200ms color, border, opacity, and transform transitions are
used for interactive affordances. Hover lift is limited to buttons and cards;
all motion respects `prefers-reduced-motion`.

## Depth
Use one soft bronze-tinted radial wash in page backgrounds and a single subtle
card shadow. Avoid glossy gradients or large elevation differences. Images sit
in an inset archival frame so remote analysis media remains legible.

## Accessibility And Debt
Every control has a visible label or `aria-label`, focus-visible outline,
semantic landmark, and status/error message announced with `aria-live`.
Color never carries state alone. Uploaded-image alternative text uses the
server-provided filename. VCA report schema is still an MVP contract, so the
visual page renders optional findings, recommendations, and report images only
when supplied instead of inventing clinical detail.
