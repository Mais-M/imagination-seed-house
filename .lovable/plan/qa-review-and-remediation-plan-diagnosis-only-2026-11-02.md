# QA review and remediation plan (diagnosis only)

Nothing has been changed. Make, webhooks, secrets, database schema, permissions and saved content stay untouched. Nothing is published.

## What the test board's saved data shows

Saved bubbles on "[TEST] Insights Stage B" (none deleted):
- English insight bubbles: 2 accepted IDEA bubbles exist (incl. "Frame the workshop around a simple arc…").
- "Trip plan" note bubble: saved **twice** (21:07 and 21:35).
- Hebrew: only the note bubble "תכנון מחקר" was saved — **no Hebrew insight bubble**.
- Arabic: only the note bubble "مشروع" was saved — **no Arabic IDEA insight bubble**.

Conclusion: the Arabic IDEA insight was never added. The click went to the note-level "Add to mind map" button, which adds the note title, not the insight. This is the same confusion that produced the duplicate "Trip plan" bubble.

## Confirmed defects (by priority)

### P1 — Note button vs insight button confusion (causes the "missing" Arabic insight)
Why: The note-level "Add to mind map" button sits right above the insight cards and adds the note title. In Arabic the two labels are nearly identical ("أضف إلى خريطة التفكير" vs "أضف هذه الفكرة إلى الخريطة"). Clicking it again also creates duplicates.
Fix:
- Rename the note-level button to "Add note to map" / "הוספת הפתק למפה" / "أضف الملاحظة إلى الخريطة".
- Change the Arabic insight label to "أضف هذه الرؤية إلى الخريطة" (matches the "رؤى" Insights tab word).
- Make the toast after each action say what was added: "Note added to map" vs "Insight added to map".
- Show the note button as "Already on map" (disabled) when a bubble linked to that note already exists, to stop duplicates. Existing duplicates are not touched.

### P1 — Untranslated category labels in Insights cards
Why: the card shows the raw value `s.type` in uppercase (IDEA, QUESTION…), not the translation. The mind map already uses translated labels (aiIdea, aiQuestion…).
Fix: reuse the same translated labels on the cards; remove forced uppercase (meaningless in Hebrew/Arabic).

### P2 — Clipped buttons inside Insights cards
Why: the two buttons sit in a row that cannot wrap; with the longer label (especially in Hebrew/Arabic) at narrow widths, the button text overflows the card.
Fix: let the button row wrap, allow the add button's text to wrap, and keep the card at full width when the panel is narrow.

### P2 — New bubbles land on top of existing ones
Why: insight and note bubbles are placed at a random spot within ±150px of the center. Since bubbles are now up to 280px wide, they often overlap.
Fix: only for **newly added** bubbles, choose the first free spot in a spiral around the center that doesn't overlap existing bubbles. Existing bubbles are never moved; dragging is unchanged.
Bubble sizes used for the overlap check:
- **Existing bubbles:** their real on-screen size, measured from the mind map when it is open (each bubble's rendered width and height).
- **When the map isn't open** (adding from Notes) or a bubble hasn't been measured yet: a reliable estimate from its text — width from text length, clamped to 110–280px; height from the estimated number of wrapped lines times line height, plus padding and the AI label row for AI bubbles. The estimate rounds up and allows wider characters, so Hebrew and Arabic text is never underestimated.
- **The new bubble:** estimated the same way from its own text, so a long insight reserves enough room.
- A small gap (about 24px) is kept between bubbles. If no free spot is found within a set search radius, the farthest tried spot is used; nothing else moves.

## Suspected / minor issues (to verify during testing)
- Hebrew/Arabic insight text inside cards: the edit box already uses automatic direction; verify the card layout and button order flip correctly. Fix only if wrong.
- The insight suggestions stay on screen after switching notes back, but vanish on switch; acceptable, no change.
- Accessibility: color swatch buttons are labelled with the color code (e.g. "lime") — fine; the insight edit box has no label. Add an accessible label "Edit insight".
- Note deletion (removeNote) is a hard delete with no confirmation. Out of scope unless you want it; noted only.

## Not changed
Spark with AI, Make, the Insights request/response, realtime, notes/TODO logic, Google sign-in, undo/redo, Recently Deleted, saved positions and content.

## Verification
- New unit tests:
  - free-spot placement: returns the center when empty; avoids overlap with given bubbles; a long multi-line new bubble does not overlap a tall existing bubble; uses measured sizes when given instead of estimates; never changes the positions of existing bubbles.
  - size estimate: longer text gives a taller (never shorter) bubble; width stays within 110–280px; Hebrew/Arabic text gets an estimate at least as large as English of the same length.
  - every insight type has a translated label in en/he/ar, and he/ar labels differ from English.
- Run existing tests (normalizeInsights, humanizeIds).
- Preview check on the test board in en/he/ar: insight cards show translated categories, no clipped buttons at 890px width, adding an insight creates an insight bubble (checked in the saved data) that doesn't overlap, note button shows "Already on map", Spark with AI still works.

## Technical details
- `src/lib/i18n.tsx`: change `toMap` text, update ar `addInsightToMap`, add `noteAddedToMap`, `insightAddedToMap`, `alreadyOnMap`, `editInsight`.
- `src/components/NotesPanel.tsx`: translated type label, wrapping button row, toasts, already-on-map state (needs `nodes` prop), placement via helper.
- `src/lib/placement.ts` (new) + `placement.test.ts`: `estimateBubbleSize(text, isAi)` and `findFreeSpot(existing: {x,y,w,h}[], newSize)`.
- `src/components/MindMap.tsx`: record each bubble's rendered size (display only, not saved) into a shared lookup used by placement; no change to dragging, positions or links.
- `src/lib/i18n.test.ts` (new): label coverage test.
- `src/routes/_authenticated/board.$boardId.tsx`: pass `nodes` to NotesPanel.
