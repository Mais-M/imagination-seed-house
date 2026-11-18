# Security review before making the GitHub repository public

Read-only review. Nothing was changed.

## Result
- **Leaked secrets:** none. I searched the current files and all 109 saved versions of the project. Nothing that only exists on GitHub was searched.
- **Deep code scan:** found 2 serious access-control problems. They are in how the app is built, not in the repository, so making the repository public does not cause them. They already affect the live app, and a public repository makes them easier to spot.

## Finding 1 (serious): someone can receive an invitation meant for another person
- **What happens:** any signed-in user can change the email saved on their own profile to someone else's address. When a board owner then shares a board with that address, the wrong person gets access and can read or edit the board.
- **Where:** the profile permissions and the board-sharing function in the database (`drizzle/migrations/0000_migration.sql`).
- **Proposed fix:** stop users from editing their own profile email, so it always matches their Google sign-in email. Display name and photo stay editable.

## Finding 2 (serious): an editor can take ownership of a shared board
- **What happens:** the database lets any editor change a board's owner to themselves. They could then remove the real owner or delete the board.
- **Where:** the board permissions in the database (same file).
- **Proposed fix:** only allow board updates that keep the owner unchanged. Editors can still rename the board.

## Finding 3 (low): permission checks callable by signed-out visitors
- **What happens:** signed-out visitors can call the internal "can this person view/edit this board" checks, but these only ever answer "no" for them.
- **Proposed fix:** block signed-out visitors from calling these checks.

## Not affected
- Mind Map, Spark with AI, Insights, Make, Google sign-in, notes, TODOs, existing boards and members, and saved content all stay as they are.

## How I'd check the fixes
- Signed in as a regular user, try to change your profile email and confirm it is refused.
- As an editor, try to change a board's owner and confirm it is refused. Renaming the board must still work.
- Sharing, editing, the AI features and live collaboration must still work. The security scan must show both serious findings resolved.

## Technical details
- Restrict profile updates so the `email` column cannot change. Only `display_name` and `avatar_url` stay updatable, through a column-level grant or a trigger that rejects email changes.
- Add a `boards` update guard (a trigger) that rejects any change to `owner_id`.
- `revoke execute ... from anon` on `can_edit_board`, `can_view_board`, `is_board_owner`, `shares_board_with` and `handle_new_user`.
- One database migration only. No app code changes.
