# Diagnosis: missing Insights bubble and narrow green bubble (findings only)

## 1. Was the "bee ecology immersion" bubble created?
No. The board has no idea starting "Frame the workshop as a hands-on bee ecology immersion...", deleted or not.

## 2. What was created instead
At 21:07:31 one new bubble was saved:
- Text: "Trip plan" (the note's title), color sky, not AI, status accepted, linked to the note.
- Position: x = -66, y = -7. That's near the center of the map, right next to the tall green bubble at (29, 122).

## 3. Why
The preview's request log shows Insights returned the IDEA suggestion. About a minute later, the app saved the **note itself** to the map. That is the job of the "Add to mind map" button in the note header. The button inside the suggestion card saves the suggestion text instead, and it was never pressed.

Likely cause: the two buttons share the same "Add to mind map" label and icon style, and they sit close together. So the wrong one is easy to click. The code works as written. The suggestion card simply wasn't used, and nothing blocked it from being saved.

## 4. Why the green bubble is very narrow and tall
Each bubble is placed inside a 0-width container on the map. With no room to grow, it shrinks to its minimum width (110px) instead of its intended maximum (240px). A long text, like the edited "three-part learning arc" idea, then wraps into a tall, thin column. Short bubbles look fine because they fit in 110px. This is a display issue only: the saved text is complete.

## Possible fixes (pending your approval, nothing changed yet)
- Give suggestion-card buttons a distinct label, such as "Add this suggestion to map", so they can't be confused with the note button.
- Give bubbles a sensible width (for example, fit the content up to 240px) so long ideas wrap into a normal shape.
- Optionally remove the extra "Trip plan" bubble on the test board, only if you want that.
