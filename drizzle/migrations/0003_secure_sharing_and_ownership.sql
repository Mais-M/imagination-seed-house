CREATE OR REPLACE FUNCTION public.share_board(_board uuid, _email text, _role text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare _uid uuid;
begin
  if not public.is_board_owner(_board) then raise exception 'not_owner'; end if;
  if _role not in ('editor','viewer') then raise exception 'bad_role'; end if;
  select id into _uid from auth.users where lower(email) = lower(trim(_email)) limit 1;
  if _uid is null then return 'not_found'; end if;
  if _uid = auth.uid() then return 'self'; end if;
  insert into board_members(board_id,user_id,role) values (_board,_uid,_role)
    on conflict (board_id,user_id) do update set role = excluded.role;
  return 'ok';
end; $function$;

CREATE OR REPLACE FUNCTION public.block_profile_email_change()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$ begin
  if new.email is distinct from old.email then raise exception 'email_locked'; end if;
  return new;
end $$;
DROP TRIGGER IF EXISTS profiles_lock_email ON public.profiles;
CREATE TRIGGER profiles_lock_email BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.block_profile_email_change();

CREATE OR REPLACE FUNCTION public.block_board_owner_change()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$ begin
  if new.owner_id is distinct from old.owner_id then raise exception 'owner_locked'; end if;
  return new;
end $$;
DROP TRIGGER IF EXISTS boards_lock_owner ON public.boards;
CREATE TRIGGER boards_lock_owner BEFORE UPDATE ON public.boards FOR EACH ROW EXECUTE FUNCTION public.block_board_owner_change();

REVOKE EXECUTE ON FUNCTION public.can_edit_board(uuid), public.can_view_board(uuid), public.is_board_owner(uuid), public.shares_board_with(uuid), public.share_board(uuid,text,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_edit_board(uuid), public.can_view_board(uuid), public.is_board_owner(uuid), public.shares_board_with(uuid), public.share_board(uuid,text,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.block_profile_email_change(), public.block_board_owner_change() FROM anon, authenticated, public;