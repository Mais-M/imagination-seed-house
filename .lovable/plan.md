# Security review before making the GitHub repository public

Read-only review. Nothing was changed.

## Result: safe to make public, with one optional improvement

### Keys, secrets and credentials
- No private keys, passwords, tokens or Make webhook addresses were found in the code, the saved plans or the config files.
- The private values (both Make webhook addresses, the server-only backend key and the AI key) are kept in the backend's secret storage. The code only reads them on the server.
- `.env` is included in the repository. It only holds the public "publishable" app key, the project ID and the backend address. These are meant to be public, because every visitor's browser already receives them. No action is needed.
- No email addresses or personal data were found in the project files.

### Database access control
- The basic security scan found no issues. Every table has access rules: only board members can see a board, only owners and editors can change it, and only the owner can share it.
- The database linter flags 5 internal permission-check functions (such as "can this user edit this board") because signed-out visitors can call them. They only answer yes or no about the caller themselves, and a signed-out visitor always gets "no", so nothing leaks. This is a low risk.
- Optional hardening for later (not done): block signed-out visitors from calling those functions.

### Things to keep in mind
- Never paste a webhook address or key into a code file, a note or a commit message.
- GitHub keeps old versions of files. Nothing sensitive was found in the current files, but I did not search the full commit history.
- I did not run the deep code scan. I can run it if you want a more thorough review.
