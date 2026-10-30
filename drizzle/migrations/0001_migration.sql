drop policy "view boards" on public.boards;
create policy "view boards" on public.boards for select to authenticated using (owner_id = auth.uid() or public.can_view_board(id));