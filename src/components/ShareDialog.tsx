import { useEffect, useState } from "react";
import { Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

type Member = { user_id: string; role: string; email?: string | null; name?: string | null };

export function ShareDialog({ boardId, isOwner }: { boardId: string; isOwner: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [members, setMembers] = useState<Member[]>([]);

  const load = async () => {
    const { data } = await supabase.from("board_members").select("user_id,role").eq("board_id", boardId);
    const ids = (data ?? []).map((m) => m.user_id);
    const { data: profs } = ids.length ? await supabase.from("profiles").select("id,email,display_name").in("id", ids) : { data: [] };
    setMembers((data ?? []).map((m) => {
      const p = profs?.find((x) => x.id === m.user_id);
      return { ...m, email: p?.email, name: p?.display_name };
    }));
  };
  useEffect(() => {
    if (open) load();
  }, [open]);

  const invite = async () => {
    const { data, error } = await supabase.rpc("share_board", { _board: boardId, _email: email, _role: role });
    if (error) return toast.error(error.message);
    if (data === "not_found") return toast.error(t("notFoundUser"));
    if (data === "ok") {
      toast.success(t("invited"));
      setEmail("");
      load();
    }
  };
  const remove = async (uid: string) => {
    await supabase.from("board_members").delete().eq("board_id", boardId).eq("user_id", uid);
    load();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm"><Share2 /> {t("share")}</Button>
      </DialogTrigger>
      <DialogContent className="rounded-[2rem]">
        <DialogHeader><DialogTitle className="font-display text-2xl">{t("share")}</DialogTitle></DialogHeader>
        {isOwner && (
          <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); invite(); }}>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("inviteEmail")} className="min-w-0 flex-1 rounded-full" />
            <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-full border-2 border-input bg-card px-3 text-sm">
              <option value="editor">{t("editor")}</option>
              <option value="viewer">{t("viewer")}</option>
            </select>
            <Button type="submit">{t("invite")}</Button>
          </form>
        )}
        <ul className="flex flex-col gap-2">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm">
              <span className="flex-1 truncate">{m.name ?? m.email ?? m.user_id.slice(0, 8)} <span className="text-muted-foreground">{m.email}</span></span>
              <span className="text-xs font-semibold">{m.role === "editor" ? t("editor") : t("viewer")}</span>
              {isOwner && <button aria-label={t("remove")} onClick={() => remove(m.user_id)}><Trash2 className="size-4 text-destructive" /></button>}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
