# Plan: two small UX fixes (bubble width, insight button label)

Only these two changes. Make, webhooks, secrets, the database, permissions and saved content all stay untouched. Nothing gets published.

## 1. Readable width for long bubbles

**Cause:** Each bubble sits in a container with no width, so it shrinks to its minimum width (110px). Long text then wraps into a tall, narrow column.

**Change (display only, in the mind map bubble):**
- Add `w-max` to the bubble so it sizes to its text, still between 110px and 240px.
- Raise the maximum width from 240px to 280px so long ideas wrap into a normal block shape.

**Unchanged:** Each bubble's center point (x/y), dragging, links between bubbles, the saved text, editing, colors, suggestion styling, and Undo/Recently Deleted. Short bubbles look exactly the same as now.

## 2. Separate label for the insight button

- New text key `addInsightToMap`:
  - en: "Add this insight to map"
  - he: "הוספת התובנה הזו למפה"
  - ar: "أضف هذه الفكرة إلى الخريطة"
- Only the button inside each Insights suggestion card uses the new label.
- The note-level "Add to mind map" button keeps its current label and behavior.

## Checks after you approve
- In the preview test board: the long "three-part learning arc" bubble is wide and readable, it still drags freely, and its links still attach to it.
- The insight card shows the new label in English, Hebrew and Arabic, right-to-left where needed.
- Existing tests still pass.

## Technical details
- `src/components/MindMap.tsx`: bubble class `max-w-[240px] min-w-[110px]` changes to `w-max max-w-[280px] min-w-[110px]`.
- `src/lib/i18n.tsx`: add `addInsightToMap` in all three languages.
- `src/components/NotesPanel.tsx`: the suggestion card button uses `t("addInsightToMap")`.
