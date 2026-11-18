# Why the security finding is still showing

Read-only check. Nothing was changed.

## Answer: the fixes are live in the database. The findings are old reports from before the fix.
- **When the findings were reported:** 19:39 and 20:01 UTC.
- **When the fix was applied:** 20:37 UTC.
- No scan has finished since the fix. A new scan was still running during this check.

## Confirmed live in the database right now
- **Sharing:** the board-sharing function looks people up by their real Google sign-in email.
- **Profile email:** the lock on profile emails is in place.
- **Board owner:** the lock on board owners is in place.
- **Earlier checks, signed in as your account:**
  - Changing a profile email was refused, and changing a display name worked.
  - Changing a board's owner was refused, and renaming a board worked.
  - Sharing with a real account worked. An unknown email gave "not found", and sharing with yourself was caught.
  - Signed-out visitors were blocked from the permission checks.

## Why the scanner might still flag it
- The scanner reads the project's database history files. The oldest one still contains the original, unsafe rules. The newer file that fixes them comes after it, but a scanner can sometimes miss the order. If that happens, the finding is a false alarm about old history, not a live problem.

## What is needed to clear it
1. Wait for the running scan to finish, or start a new deep scan from the Security view. It should no longer report the two issues.
2. If it still lists them, I mark both findings as fixed, with a note pointing to the later fix and the checks above. No code or database changes are needed.
3. Optional extra proof: sign in as an editor, try to take over a board, and confirm it is refused.
