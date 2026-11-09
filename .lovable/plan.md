# Diagnosis: "TODO List" tap does nothing on iPhone

## What I checked
- **The button itself:** "Notes & TODOs" is a simple switch on the board page. It does not check permissions, load a page, or call the server. On a simulated iPhone 13 (390px), tapping it switched to the notes view right away. Nothing covered the button and there were no page errors.
- **Permissions:** there is only one shared board ("Untitled board"), and the second user is an **Editor** on it. Viewers and editors both see the notes view. Viewers just don't get the "New note" / "TODO" buttons.
- **Database:** no notes or TODO lists were created in the last 3 days, so the tap did not quietly create a TODO list in the background either.
- **Phone layout (most likely cause):** on a phone, the page header wraps onto 3 rows, about 194px tall. The board page is locked to exactly one screen height and cannot scroll. In the iPhone simulation the notes editor started near the very bottom (about 620px down on a 664px screen). Real iPhone Safari covers even more of the screen with its address bar and toolbar. So the notes view and a new TODO list can open completely below the visible area, and the page won't scroll to show them. It looks like nothing happened, and no error appears because nothing failed.

## Conclusion (likely, not fully confirmed)
- This affects **phones in general**, and iPhone Safari the most because of its toolbars. It is not tied to the account or its permissions.
- Saving works fine. Only what you see on the screen is broken.
- I could not test real iPhone Safari or the other user's actual login. Please tell me which button was tapped: the top **"Notes & TODOs"** switch or the green/blue **"TODO"** button inside it.

## Smallest safe fix (only the board page and Notes panel layout)
1. Size the board page to the screen height the phone actually shows, instead of a fixed height that Safari's toolbars cover.
2. On narrow screens only, let the Notes panel scroll up and down, and keep the notes list short so the editor stays reachable.
3. On narrow screens, when a note or TODO list is created or selected, scroll it into view.

Nothing changes on desktop. The Mind Map, AI features, Make, sign-in, database, permissions and saved content all stay as they are.

## How I'd check it
- Simulated iPhone at 390px and 420px, in English, Hebrew and Arabic: tap "Notes & TODOs", then "TODO", and confirm the new list is visible and you can type in it.
- Confirm desktop looks exactly the same, and run the existing automated tests.
- You confirm on your real iPhone after publishing.

## Technical details
- `board.$boardId.tsx`: `h-screen` → `h-dvh`.
- `NotesPanel.tsx`: on mobile, the root becomes `overflow-y-auto` (stays `md:overflow-hidden`), the aside gets `max-h-[40vh] md:max-h-none`, and `scrollIntoView` runs on the editor section when `active` changes (mobile only).
