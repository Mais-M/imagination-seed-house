# Fix plan: board invitations and board ownership

Plan only. Nothing has been changed yet.

## What I checked
- The app never changes anyone's profile email or a board's owner. It only reads profiles to show member names, and it only renames boards.
- All 5 saved profiles currently have the same email as the account's Google sign-in. No existing data is affected and nothing needs cleaning up.

## Issue 1: an invitation can reach the wrong person
- **Problem:** sharing finds the person by the email on their profile. Anyone can edit their own profile email, so someone could claim another person's address and receive that person's invitations.
- **Fix, part A:** sharing will look the person up by their real Google sign-in email instead of the editable profile email.
- **Fix, part B:** the database will refuse any change to a profile's email. Names and photos are unaffected.

## Issue 2: an editor can take over a board
- **Problem:** editors can change any part of a board, including who owns it.
- **Fix:** the database will refuse any change to a board's owner. Owners and editors can still rename the board.

## Optional, low risk
- Block signed-out visitors from calling the internal permission checks. Signed-in use stays exactly the same.

## Not changed
- Google sign-in, sharing by email, editor and viewer roles, live collaboration, Mind Map, Spark with AI, Insights, Make, notes, TODOs, and all existing boards, members and content.

## How I'll verify
1. As a regular signed-in user, try to change the profile email: it is refused. Changing the display name still works.
2. As an editor, try to change a board's owner: it is refused. Renaming the board as an editor still works.
3. As the owner, share a board with a real account email: it works, and the person appears in the member list. Sharing with an unknown email still says "not found".
4. Open the shared board as the invited user, edit a bubble and a TODO, and confirm the change shows up live for the owner.
5. Re-run the security scan and confirm both serious findings are resolved. Run the existing automated tests.

These tests run on a temporary test board. I'll remove anything I create when I'm done.

## Technical details (one database migration, no app code changes)
- `share_board`: look the person up in `auth.users` by email (still `security definer`, `search_path=public`). The same `not_found` / `self` / `ok` results, so the share dialog keeps working.
- Trigger on `public.profiles` BEFORE UPDATE: raise an error if `new.email is distinct from old.email`. Sign-up creates profiles with an insert, so this trigger never touches it.
- Trigger on `public.boards` BEFORE UPDATE: raise an error if `new.owner_id is distinct from old.owner_id`.
- Optional: `revoke execute ... from anon, public` on `can_edit_board`, `can_view_board`, `is_board_owner`, `shares_board_with`, `handle_new_user`. Keep signed-in access, since the app calls `can_edit_board` directly.
