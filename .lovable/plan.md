# Overlapping and hidden bubbles on [TEST] Insights Stage B: final diagnosis

Nothing was changed. No bubbles were moved, and no suggestions were kept or dismissed.

## What I checked (just now, read-only)
- All 64 live bubbles on the test board: saved position, estimated size and creation time.
- 44 of them are pending Spark suggestions.
- The newest bubble is from 20:35. No bubbles were added since the last check.
- I used a slightly larger size estimate than last time, so more borderline overlaps were counted.

## Findings
**1. Overlaps come from old saved positions.**
- 28 bubble pairs overlap with the larger estimate. 27 of them involve only bubbles made before the placement fix (about 19:54).
- The one remaining pair is "Frame the workshop as a three-part learning arc..." (19:54:30, the moment the fix arrived) and a Hebrew suggestion from 18:57. They touch by about 5px, and only in the estimate. That is within the estimate's safety margin, not a real collision.
- None of the 39 bubbles made after the fix overlaps another one.

**2. The placement uses real sizes and avoids the toolbar.**
- New bubbles use the measured size of bubbles already on screen, or a generous estimate for Hebrew, Arabic and long text.
- New bubbles prefer the visible area below the floating toolbar.
- If no space is free there, they go to the nearest free spot. The view then slides once to show them.

**3. Zoom and pending suggestions.**
- Zoom is included when the visible area is calculated, and it is never changed automatically.
- Pending Spark suggestions count as taken space, so new bubbles avoid them. The many old pending suggestions crowd the board, so new bubbles land farther out. They do not cause overlaps.
- Bubbles that look hidden under the toolbar are older ones, or bubbles that you scrolled under the toolbar. Panning the map shows them.

**4. New insight and note bubbles can be placed safely.** Tests and earlier Preview checks confirm this. This board looks messy only because of positions saved in earlier test rounds.

## Is a fix needed?
**No code fix is needed before publishing.** Existing positions stay as they are, as your rules require.

## Smallest safe options (no change without your approval)
- Keep using a fresh board for the demo (your choice from before).
- Optionally tidy this test board by hand: drag bubbles apart, or Keep or Dismiss suggestions yourself.

## Note
Sizes are estimates for bubbles that are not on screen. In the preview, a few long bubbles may look slightly different.
