# UI Audit — July 2026

Audit of Dastan web app surfaces against the Phase 4 principles in `7-5-26 upgrade.md`. Items marked **Fixed** were addressed in this pass; **Deferred** are tracked in `future-tasks.md`.

## Hub / Vault

| Issue | Severity | Resolution |
|-------|----------|------------|
| Script cards lacked runtime estimate | Low | **Fixed** — `formatPageAndRuntime` on cards |
| Duplicate/share only in editor | Medium | **Fixed** — hub action menus wired |
| Project delete semantics unclear | Medium | **Fixed** — soft-delete with 30-day trash + confirmation copy |
| Empty hub state | Low | Existing welcome panel; verify CTA on zero scripts |

## Editor / Script page

| Issue | Severity | Resolution |
|-------|----------|------------|
| Paged view implied true pagination | High | **Fixed** — labeled “approx. page preview”; deferred WYSIWYG pagination |
| Scene navigator active state near-invisible | Medium | **Fixed** — `EditorNavigator` active scene uses `modeActive` + ring |
| MORE/CONT'D settings silent no-op | High | **Fixed** — “Coming soon” badge; controls disabled |
| Orphan `SceneNavigator.tsx` | Low | **Fixed** — removed (superseded by `EditorNavigator`) |
| Focus mode hides chrome | OK | Already implemented |
| Courier page margins | OK | `screenplay-layout.ts` + CSS aligned |

## AI panel

| Issue | Severity | Resolution |
|-------|----------|------------|
| Misleading “50 prompts left” without cloud | High | **Fixed** — credits chip only when `dastan-cloud` registered |
| Tool calls mutated script silently | High | **Fixed** — accept/reject preview bar |
| Long threads resent full history | Medium | **Fixed** — compress older turns into system appendix |
| Attach-file button inert | Low | **Fixed** — removed/hidden in prior pass |
| API key security copy | Low | **Fixed** — “sent directly to your provider” on AI key cards |

## Settings

| Issue | Severity | Resolution |
|-------|----------|------------|
| Cloud-only notification toggles | Medium | **Fixed** — not present in UI (removed from settings surface) |
| Address book without cloud | Low | Kept — local contacts still useful for share dialog |

## Performance

| Issue | Severity | Resolution |
|-------|----------|------------|
| Monolithic bundle | Medium | **Partial** — `React.lazy` for hub, editor, AI panel, PDF export |
| pdfjs loaded eagerly | Medium | **Fixed** — dynamic import in export path |

## Accessibility / themes

| Issue | Severity | Resolution |
|-------|----------|------------|
| Dark/light parity on scene highlight | Medium | **Fixed** — theme tokens for active scene |
| WCAG AA full pass | Medium | **Deferred** — spot-check only; full contrast sweep needed |

## Dialogs / consistency

| Issue | Severity | Resolution |
|-------|----------|------------|
| Mixed hand-rolled vs `@dastan/ui` dialogs | Low | **Deferred** — migrate incrementally |
| Keyboard shortcut discoverability | Low | **Partial** — tooltips on toolbar; `?` modal exists |

## States (loading / empty / error)

| Surface | Status |
|---------|--------|
| Hub zero scripts | OK — welcome + new script CTA |
| Empty trash | OK |
| AI no API key | OK — settings prompt in input |
| Import failure | OK — alert dialogs |
| Version history empty | OK — dashed placeholder |

## Remaining deferred

- True WYSIWYG pagination (`future-tasks.md`)
- Full WCAG contrast audit
- Bundle size under 500 kB for editor chunk
- Cloud settings when `dastan-cloud` ships
