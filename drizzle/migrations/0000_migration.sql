
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null default 'Untitled board',
  color text not null default 'mint',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.boards to authenticated;
grant all on public.boards to service_role;
alter table public.boards enable row level security;

create table public.board_members (
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'editor' check (role in ('editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);
grant select, insert, update, delete on public.board_members to authenticated;
grant all on public.board_members to service_role;
alter table public.board_members enable row level security;

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  created_by uuid not null default auth.uid(),
  title text not null default '',
  content text not null default '',
  kind text not null default 'note' check (kind in ('note','todo')),
  color text not null default 'sun',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.notes to authenticated;
grant all on public.notes to service_role;
alter table public.notes enable row level security;

create table public.todo_items (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  text text not null default '',
  done boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.todo_items to authenticated;
grant all on public.todo_items to service_role;
alter table public.todo_items enable row level security;

create table public.nodes (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  created_by uuid default auth.uid(),
  text text not null default '',
  color text not null default 'sky',
  x double precision not null default 0,
  y double precision not null default 0,
  is_ai boolean not null default false,
  ai_type text,
  status text not null default 'accepted' check (status in ('accepted','suggested')),
  source_node_id uuid references public.nodes(id) on delete set null,
  note_id uuid references public.notes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.nodes to authenticated;
grant all on public.nodes to service_role;
alter table public.nodes enable row level security;

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  from_node uuid not null references public.nodes(id) on delete cascade,
  to_node uuid not null references public.nodes(id) on delete cascade,
  is_ai boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.connections to authenticated;
grant all on public.connections to service_role;
alter table public.connections enable row level security;

-- access helpers
create or replace function public.can_view_board(_board uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from boards where id=_board and owner_id=auth.uid())
      or exists(select 1 from board_members where board_id=_board and user_id=auth.uid());
$$;
create or replace function public.can_edit_board(_board uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from boards where id=_board and owner_id=auth.uid())
      or exists(select 1 from board_members where board_id=_board and user_id=auth.uid() and role='editor');
$$;
create or replace function public.is_board_owner(_board uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from boards where id=_board and owner_id=auth.uid());
$$;
create or replace function public.shares_board_with(_other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from boards b
    left join board_members m on m.board_id=b.id
    where (b.owner_id=auth.uid() or exists(select 1 from board_members x where x.board_id=b.id and x.user_id=auth.uid()))
      and (b.owner_id=_other or m.user_id=_other)
  );
$$;

-- profiles
create policy "own or collaborator profiles" on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_board_with(id));
create policy "insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid());

-- boards
create policy "view boards" on public.boards for select to authenticated using (public.can_view_board(id));
create policy "create boards" on public.boards for insert to authenticated with check (owner_id = auth.uid());
create policy "edit boards" on public.boards for update to authenticated using (public.can_edit_board(id));
create policy "delete own boards" on public.boards for delete to authenticated using (owner_id = auth.uid());

-- members
create policy "view members" on public.board_members for select to authenticated using (public.can_view_board(board_id));
create policy "owner adds members" on public.board_members for insert to authenticated with check (public.is_board_owner(board_id));
create policy "owner updates members" on public.board_members for update to authenticated using (public.is_board_owner(board_id));
create policy "owner or self removes" on public.board_members for delete to authenticated using (public.is_board_owner(board_id) or user_id = auth.uid());

-- content tables
create policy "view notes" on public.notes for select to authenticated using (public.can_view_board(board_id));
create policy "insert notes" on public.notes for insert to authenticated with check (public.can_edit_board(board_id));
create policy "update notes" on public.notes for update to authenticated using (public.can_edit_board(board_id));
create policy "delete notes" on public.notes for delete to authenticated using (public.can_edit_board(board_id));

create policy "view todos" on public.todo_items for select to authenticated using (public.can_view_board(board_id));
create policy "insert todos" on public.todo_items for insert to authenticated with check (public.can_edit_board(board_id));
create policy "update todos" on public.todo_items for update to authenticated using (public.can_edit_board(board_id));
create policy "delete todos" on public.todo_items for delete to authenticated using (public.can_edit_board(board_id));

create policy "view nodes" on public.nodes for select to authenticated using (public.can_view_board(board_id));
create policy "insert nodes" on public.nodes for insert to authenticated with check (public.can_edit_board(board_id));
create policy "update nodes" on public.nodes for update to authenticated using (public.can_edit_board(board_id));
create policy "delete nodes" on public.nodes for delete to authenticated using (public.can_edit_board(board_id));

create policy "view connections" on public.connections for select to authenticated using (public.can_view_board(board_id));
create policy "insert connections" on public.connections for insert to authenticated with check (public.can_edit_board(board_id));
create policy "update connections" on public.connections for update to authenticated using (public.can_edit_board(board_id));
create policy "delete connections" on public.connections for delete to authenticated using (public.can_edit_board(board_id));

-- share by email (owner only)
create or replace function public.share_board(_board uuid, _email text, _role text)
returns text language plpgsql security definer set search_path = public as $$
declare _uid uuid;
begin
  if not public.is_board_owner(_board) then raise exception 'not_owner'; end if;
  if _role not in ('editor','viewer') then raise exception 'bad_role'; end if;
  select id into _uid from profiles where lower(email) = lower(trim(_email)) limit 1;
  if _uid is null then return 'not_found'; end if;
  if _uid = auth.uid() then return 'self'; end if;
  insert into board_members(board_id,user_id,role) values (_board,_uid,_role)
    on conflict (board_id,user_id) do update set role = excluded.role;
  return 'ok';
end; $$;
revoke execute on function public.share_board(uuid,text,text) from public, anon;
grant execute on function public.share_board(uuid,text,text) to authenticated;

-- profile trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id,email,display_name,avatar_url)
  values (new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.notes replica identity full;
alter table public.todo_items replica identity full;
alter table public.nodes replica identity full;
alter table public.connections replica identity full;
alter publication supabase_realtime add table public.notes, public.todo_items, public.nodes, public.connections, public.board_members;
