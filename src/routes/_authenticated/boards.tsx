import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { bubbleBg, PALETTE, randomColor } from "@/components/brand";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/boards")({
  head: () => ({
    meta: [
      { title: "My boards – IdeaVerse" },
      { name: "description", content: "Your IdeaVerse boards and boards shared with you." },
      { property: "og:title", content: "My boards – IdeaVerse" },
      { property: "og:description", content: "Your IdeaVerse boards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BoardsPage,
});

type Board = { id: string; title: string; color: string; owner_id: string; updated_at: string };

function BoardsPage() {
  const { t } = useI18n();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[] | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from("boards").select("id,title,color,owner_id,updated_at").order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    setBoards(data ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    const color = randomColor();
    const { data, error } = await supabase.from("boards").insert({ owner_id: user.id, title: t("untitled"), color }).select("id").single();
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/board/$boardId", params: { boardId: data.id } });
  };

  const remove = async (id: string) => {
    if (!confirm(t("delete") + "?")) return;
    const { error } = await supabase.from("boards").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setBoards((b) => b?.filter((x) => x.id !== id) ?? null);
  };

  const mine = boards?.filter((b) => b.owner_id === user.id) ?? [];
  const shared = boards?.filter((b) => b.owner_id !== user.id) ?? [];

  const Grid = ({ list, own }: { list: Board[]; own: boolean }) => (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {list.map((b) => (
        <div key={b.id} className="group relative animate-bubble-pop">
          <Link
            to="/board/$boardId"
            params={{ boardId: b.id }}
            className="flex h-36 flex-col justify-end rounded-[2rem] p-5 shadow-bubble transition-transform hover:-translate-y-1"
            style={{ background: bubbleBg(b.color) }}
          >
            {!own && <Users className="absolute top-4 start-4 size-5 opacity-60" />}
            <span dir="auto" className="font-display text-xl font-semibold">{b.title}</span>
            <span className="text-xs opacity-60">{new Date(b.updated_at).toLocaleDateString()}</span>
          </Link>
          {own && (
            <button
              onClick={() => remove(b.id)}
              aria-label={t("delete")}
              className="absolute top-3 end-3 rounded-full bg-card p-2 opacity-0 shadow transition-opacity group-hover:opacity-100"
            >
              <Trash2 className="size-4 text-destructive" />
            </button>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-sky-gradient">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t("myBoards")}</h1>
          <Button onClick={create}>
            <Plus /> {t("newBoard")}
          </Button>
        </div>
        {boards && mine.length === 0 && <p className="rounded-2xl bg-card p-6 text-muted-foreground shadow-bubble">{t("noBoards")}</p>}
        <Grid list={mine} own />
        {shared.length > 0 && (
          <>
            <h2 className="mb-4 mt-12 text-2xl font-bold">{t("sharedWithMe")}</h2>
            <Grid list={shared} own={false} />
          </>
        )}
      </main>
    </div>
  );
}
