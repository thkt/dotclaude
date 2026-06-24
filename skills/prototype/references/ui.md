# UI Prototype

Generate several radically different UI variations on a single route, switchable from a floating bottom bar. The user flips between variants in the browser, picks one (or steals bits from each), then throws the rest away.

If the question is about logic/state rather than what something looks like, wrong branch. Use logic.md.

## When This Is the Right Shape

- "What should this page look like?"
- "I want to see a few options for this dashboard before committing."
- "Try a different layout for the settings screen."
- Any time the user would otherwise spend a day picking between three vague mockups in their head.

## Two Sub-shapes (strongly prefer sub-shape A)

A UI prototype is much easier to judge when it is butting up against the rest of the app: real header, real sidebar, real data, real density. A throwaway route on its own is a vacuum where every variant looks fine in isolation. Default to sub-shape A whenever there is a plausible existing page to host the variants. Only reach for sub-shape B if the prototype genuinely has no nearby home.

### Sub-shape A: adjustment to an existing page (preferred)

The route already exists. Variants render on the same route, gated by a `?variant=` URL search param. The existing data fetching, params, and auth all stay; only the rendering swaps. This is the default; pick it unless there is a specific reason not to. If the prototype is for something that does not yet have a page but would naturally live inside one (a new section of the dashboard, a new card on the settings screen, a new step in an existing flow), that is still sub-shape A. Mount the variants inside the host page.

### Sub-shape B: a new page (last resort)

Use this only when the thing being prototyped genuinely has no existing page to live inside (an entirely new top-level surface, or a flow that cannot be embedded anywhere sensible). Create a throwaway route following the project's existing routing convention. Do not invent a new top-level structure. Name it so it is obviously a prototype (include the word `prototype` in the path or filename). Same `?variant=` pattern. Before committing to sub-shape B, sanity-check that there is really no existing page this could be embedded in. An empty route hides design problems a populated one would expose.

In both sub-shapes the floating bottom bar is identical.

## Process

### 1. State the Question and Pick N

Default to 3 variants. More than 5 stops being radically different and starts being noise, so cap there. Write the plan in one line, in the prototype's location or a top-of-file comment.

> "Three variants of the settings page, switchable via `?variant=`, on the existing `/settings` route."

This works whether the user is here to push back or not.

### 2. Generate Radically Different Variants

Draft each variant. Hold each one to:

- The page's purpose and the data it has access to.
- The project's component library / styling system (TailwindCSS, shadcn, MUI, plain CSS, whatever).
- A clear exported component name (`VariantA`, `VariantB`, `VariantC`).

Variants must be structurally different: different layout, different information hierarchy, different primary affordance, not just different colours. Three slightly-tweaked card grids is not a UI prototype, it is wallpaper. If two drafts come out too similar, redo one with explicit "do not use a card grid" guidance.

### 3. Wire Them Together

Create a single switcher component on the route.

```tsx
// pseudo-code, adapt to the project's framework
const variant = searchParams.get("variant") ?? "A";
return (
  <>
    {variant === "A" && <VariantA {...data} />}
    {variant === "B" && <VariantB {...data} />}
    {variant === "C" && <VariantC {...data} />}
    <PrototypeSwitcher variants={["A", "B", "C"]} current={variant} />
  </>
);
```

For sub-shape A (existing page), keep the existing data fetching above the switcher; only the rendered subtree changes per variant. For sub-shape B (new page), the throwaway route under `/prototype/<name>` mounts the same switcher.

### 4. Build the Floating Switcher

A small fixed-position bar at the bottom-centre of the screen with three pieces.

| Piece         | Behaviour                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| Left arrow    | Cycles to the previous variant (wraps around)                                                          |
| Variant label | Shows the current variant key and, if the variant exports a name, that name too (`B — Sidebar layout`) |
| Right arrow   | Cycles forward (wraps around)                                                                          |

Behaviour.

- Clicking an arrow updates the URL search param (use the framework's router, `router.replace` on Next, `navigate` on React Router) so the variant is shareable and reload-stable.
- Keyboard `←` and `→` also cycle. Do not intercept arrow keys when an `<input>`, `<textarea>`, or `[contenteditable]` is focused.
- Visually distinct from the page (high-contrast pill, subtle shadow) so it is obviously not part of the design being evaluated.
- Hidden in production builds. Gate on `process.env.NODE_ENV !== 'production'` or equivalent so a stray prototype merge cannot ship the bar to users.

Put the switcher in a single shared component so both sub-shapes reuse it. Locate it wherever shared UI lives in the project.

### 5. Hand It Over

Surface the URL and the `?variant=` keys. The user flips through whenever they get to it. The interesting feedback is usually "I want the header from B with the sidebar from C", which is the actual design they want.

### 6. Capture the Answer and Clean Up

Once a variant has won, write down which one and why (commit message, ADR, issue, or a `NOTES.md` next to the prototype if running AFK and the user has not responded yet). Then:

- Sub-shape A: delete the losing variants and the switcher; fold the winner into the existing page.
- Sub-shape B: promote the winning variant to a real route, delete the throwaway route and the switcher.

Do not leave variant components or the switcher lying around. They rot fast and confuse the next reader.

## Anti-patterns

| Trap                                           | Reason                                                                                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Variants that differ only in colour or copy    | That is a tweak, not a prototype. Real variants disagree about structure                                                      |
| Sharing too much code between variants         | A shared `<Header>` is fine; a shared `<Layout>` defeats the point. Each variant can throw out the layout                     |
| Wiring variants to real mutations              | Read-only prototypes are fine. If a variant needs to mutate, point it at a stub. The question is "what should this look like" |
| Promoting the prototype directly to production | The variant code was written under prototype constraints (no tests, minimal error handling). Rewrite it when folding in       |
