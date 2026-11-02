import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Eye, ListTodo, Network } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { MindMap } from "@/components/MindMap";
import { NotesPanel } from "@/components/NotesPanel";
import { ShareDialog } from "@/components/ShareDialog";
import { Button } from "@/components/ui/button";
import { useBoard } from "@/lib/useBoard";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/board/$boardId")({
  head: () => ({
    meta: [
      { title: "Board – IdeaVerse" },
      { name: "description", content: "An IdeaVerse mind-map board with notes and TODOs." },
      { property: "og:title", content: "Board – IdeaVerse" },
      { property: "og:description", content: "An IdeaVerse mind-map board." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BoardPage,
});

function BoardPage() {
  const { boardId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const { t } = useI18n();
  const b = useBoard(boardId);
  const [tab, setTab] = useState<"map" | "notes">("map");

  if (b.loaded && !b.board) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Button asChild><Link to="/boards">{t("back")}</Link></Button>
      </div>
    );
  }
  const isOwner = b.board?.owner_id === user.id;

  const rename = async (title: string) => {
    if (!b.board || !title.trim() || title === b.board.title) return;
    b.setBoard({ ...b.board, title });
    const { error } = await supabase.from("boards").update({ title, updated_at: new Date().toISOString() }).eq("id", boardId);
    if (error) toast.error(error.message);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <AppHeader>
        <Button asChild variant="ghost" size="sm"><Link to="/boards"><ArrowLeft className="rtl:rotate-180" /> {t("back")}</Link></Button>
        {b.board && (
          <input
            key={b.board.id + b.board.title}
            defaultValue={b.board.title}
            readOnly={!b.canEdit}
            aria-label={t("boardName")}
            onBlur={(e) => rename(e.target.value)}
            className="min-w-0 max-w-xs rounded-full bg-transparent px-3 py-1 font-display text-xl font-semibold outline-none focus:bg-muted"
          />
        )}
        <div className="flex rounded-full bg-muted p-1">
          {([["map", Network, t("mindMap")], ["notes", ListTodo, t("notes")]] as const).map(([k, Icon, label]) => (
            <button key={k} onClick={() => setTab(k)} className={cn("flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold", tab === k && "bg-card shadow")}>
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
        {!b.canEdit && b.loaded && <span className="flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground"><Eye className="size-3" /> {t("viewOnly")}</span>}
        <ShareDialog boardId={boardId} isOwner={isOwner} />
      </AppHeader>
      <main className="min-h-0 flex-1">
        {tab === "map" ? (
          <MindMap boardId={boardId} userId={user.id} canEdit={b.canEdit} nodes={b.nodes} setNodes={b.setNodes} conns={b.conns} setConns={b.setConns} notes={b.notes} />
        ) : (
          <NotesPanel boardId={boardId} canEdit={b.canEdit} notes={b.notes} setNotes={b.setNotes} todos={b.todos} setTodos={b.setTodos} nodes={b.nodes} setNodes={b.setNodes} />
        )}
      </main>
    </div>
  );
}
