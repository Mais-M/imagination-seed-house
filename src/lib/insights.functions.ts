import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeInsights, type Insight } from "@/lib/normalizeInsights";

/** Whether the separate Insights webhook (Make COPY scenario) is configured. */
export const insightsEnabled = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ enabled: !!process.env["MAKE_INSIGHTS_WEBHOOK_URL"] }));

const Input = z.object({
  boardId: z.string().uuid(),
  noteId: z.string().uuid(),
  language: z.enum(["en", "he", "ar"]),
});

type Result = { ok: true; suggestions: Insight[] } | { ok: false; error: "not_configured" | "forbidden" | "not_found" | "empty" | "upstream" };

export const requestNoteInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof Input>) => Input.parse(d))
  .handler(async ({ data, context }): Promise<Result> => {
    const url = process.env["MAKE_INSIGHTS_WEBHOOK_URL"];
    if (!url) return { ok: false, error: "not_configured" };
    const { supabase } = context;

    const { data: canEdit } = await supabase.rpc("can_edit_board", { _board: data.boardId });
    if (!canEdit) return { ok: false, error: "forbidden" };

    const { data: note } = await supabase.from("notes").select("id,title,content,kind").eq("id", data.noteId).eq("board_id", data.boardId).maybeSingle();
    if (!note) return { ok: false, error: "not_found" };

    let body = note.content ?? "";
    if (note.kind === "todo") {
      const { data: items } = await supabase.from("todo_items").select("text,done").eq("note_id", note.id).order("position");
      body = (items ?? []).map((i) => `- [${i.done ? "x" : " "}] ${i.text}`).join("\n");
    }
    body = body.trim();
    if (!body) return { ok: false, error: "empty" };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({ request_type: "note_insights", language: data.language, note_title: note.title ?? "", note_body: body.slice(0, 8000) }),
      });
      if (!res.ok) {
        console.error("Insights webhook status", res.status);
        return { ok: false, error: "upstream" };
      }
      const text = await res.text();
      const suggestions = normalizeInsights(text ? JSON.parse(text) : {});
      return { ok: true, suggestions };
    } catch (e) {
      console.error("Insights webhook failed", e);
      return { ok: false, error: "upstream" };
    }
  });
