# New-bubble placement: diagnosis and minimal fix

Nothing has been changed. No bubbles were moved, and no suggestions were kept or dismissed.

## Findings (from the code and the test board's saved positions)

### 1. Spark with AI — genuine defect (overlap)
- Suggestions are always placed on a fixed circle (320px) around the selected bubble, in the same 4 spots (above, right, below, left).
- It never checks bubble sizes or what is already there.
- Proof on the test board: Spark was run twice on "Bees" (20:58 and 19:35). Both times the 4 suggestions were saved at exactly the same spots (-350,-570 / -30,-250 / -350,70 / -670,-250), so 4 pairs sit exactly on top of each other.
- Zoom, the visible area and the toolbar are not considered.

### 2. Notes Insights / Add note to map — genuine defect (hidden under toolbar)
- Overlap avoidance works: it uses each bubble's real size when the map has been opened, or a generous estimate otherwise.
- But the search always starts at the map's fixed middle point, not at the area you are looking at. It also ignores zoom, the visible area and the toolbar.
- On a crowded board the first free spot is far out. The last insight was saved at y = -404. With the default view, that is the very top of the screen, behind the floating toolbar (seen in the screenshot).
- It did not overlap any bubble. It was only hidden.

### 3. Overlaps from earlier saved positions — not new defects
These were saved before the placement fix, or by the Spark ring described above:
- the two "Trip plan" bubbles
- "مشروع" and "New note" near the middle
- the tall green bubbles from the first Insights rounds

Per your rules, these stay where they are.

### Not affected
Dragging, Undo/Redo, links, colors and Keep/Dismiss do not decide where a bubble starts, so they are unaffected.

## Is a fix needed?
Yes, a small one. Without it, repeated Spark use stacks suggestions exactly on top of each other, and Insights bubbles can land hidden under the toolbar.

## Proposed minimal fix (new bubbles only)
1. **Spark with AI:** keep the circle-around-the-bubble idea. If a spot on the circle is already taken, use the nearest free spot instead, with the same overlap check and gap Insights uses. Each new suggestion also counts as taken for the next one.
2. **Insights and Add note to map:** start the search at the middle of the area currently on screen, not at the map's fixed middle.
   - Prefer spots that are fully visible and below the floating toolbar (zoom included).
   - Only if none is free, fall back to today's behavior.
   - If the map was never opened, today's behavior stays.
3. **Spark** also gets the visible area from the screen, so its free spots prefer what you can see.
   - This is not sent to Make.
   - The Make request and response stay exactly the same.

## Unchanged
- existing positions, dragging, links, colors, Keep/Dismiss, Undo/Redo
- the Spark request to Make and the Insights request
- the database, permissions and content

## Verification
- New tests:
  - Spark placement on a board where the circle spots are taken returns non-overlapping spots.
  - Running it twice in a row never stacks bubbles.
  - Placement prefers the visible area and skips the toolbar band.
  - Placement falls back when the visible area is full.
  - Existing positions are never changed.
- Run all existing tests.
- Preview check on the test board, desktop and 420px:
  - run Spark once on a bubble that already has suggestions
  - add one insight
  - confirm the new bubbles are visible, not under the toolbar, and not on other bubbles
  - pending suggestions stay untouched
  - temporary test bubbles are reported.

## Technical details
- `src/lib/placement.ts`: `findFreeSpot` gains an optional `prefer` rectangle (world coordinates). It does a first pass limited to candidates fully inside it, then the current unbounded pass. It also gains `placeMany(existing, sizes, opts)` for sequential placement, plus a shared `visibleArea` holder (display only, never saved).
- `src/components/MindMap.tsx`: on view change, store the visible world rectangle minus the toolbar height (about 70px of screen, divided by zoom) into `visibleArea`. Pass it as an optional `view` field to `requestBrainstorm`.
- `src/components/NotesPanel.tsx`: `spotFor` passes `visibleArea` as `prefer` and uses its center as the search start.
- `src/lib/brainstorm.functions.ts`: replace the fixed-ring positions with a spot near each ring point via `findFreeSpot`. Existing nodes use estimated sizes, since the server has no measured sizes. The optional `view` is validated as finite numbers and is not added to the Make payload.
- `src/lib/placement.test.ts`: the added tests above.
