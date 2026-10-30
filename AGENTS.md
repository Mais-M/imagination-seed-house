<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Board access is enforced in the database (can_view_board / can_edit_board helpers in RLS); never rely on UI checks alone.
- AI brainstorming goes only through the server function in src/lib/brainstorm.functions.ts calling the MAKE_WEBHOOK_URL secret; AI output is stored as nodes with status 'suggested' so it never overwrites user ideas or becomes a TODO automatically.
- Live collaboration uses realtime subscriptions in src/lib/useBoard.ts; UI text lives in src/lib/i18n.tsx (en/he/ar, RTL for he/ar).
- Mind-map nodes and connections are soft-deleted via deleted_at (shown in Recently Deleted for 30 days); every read and the AI context must filter deleted_at IS NULL. Pending AI suggestions that are dismissed are hard-deleted so they never clutter the trash.
