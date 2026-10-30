import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  boardId: z.string().uuid(),
  focusNodeId: z.string().uuid(),
  language: z.enum(["en", "he", "ar"]),
  requestType: z.string().max(40).default("expand"),
});

const TYPE_COLOR: Record<string, string> = { idea: "lime", question: "sky", connection: "lilac", perspective: "peach" };

export const requestBrainstorm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof Input>) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const url = process.env["MAKE_WEBHOOK_URL"];
    if (!url) return { ok: false as const, error: "not_configured" as const, added: 0 };

    const { data: canEdit } = await supabase.rpc("can_edit_board", { _board: data.boardId });
    if (!canEdit) return { ok: false as const, error: "forbidden" as const, added: 0 };

    const [{ data: nodes }, { data: conns }] = await Promise.all([
      supabase.from("nodes").select("id,text,color,x,y,is_ai,status").eq("board_id", data.boardId).is("deleted_at", null).limit(300),
      supabase.from("connections").select("id,from_node,to_node").eq("board_id", data.boardId).is("deleted_at", null).limit(600),
    ]);
    const focus = nodes?.find((n) => n.id === data.focusNodeId);
    if (!focus) return { ok: false as const, error: "no_focus" as const, added: 0 };

    const request_id = crypto.randomUUID();
    let body: unknown;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({
          request_id,
          user_id: userId,
          board_id: data.boardId,
          language: data.language,
          request_type: data.requestType,
          focus_node: { id: focus.id, text: focus.text },
          existing_nodes: (nodes ?? []).filter((n) => n.status === "accepted").map((n) => ({ id: n.id, text: n.text, is_ai: n.is_ai })),
          connections: (conns ?? []).map((c) => ({ from: c.from_node, to: c.to_node })),
        }),
      });
      if (!res.ok) {
        console.error("Make webhook status", res.status);
        return { ok: false as const, error: "upstream" as const, added: 0 };
      }
      const text = await res.text();
      body = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error("Make webhook failed", e);
      return { ok: false as const, error: "upstream" as const, added: 0 };
    }

    const raw = (body as { suggestions?: unknown })?.suggestions;
    const list = Array.isArray(raw) ? raw.slice(0, 12) : [];
    const ids = new Set((nodes ?? []).map((n) => n.id));
    const rows = list
      .map((s: Record<string, unknown>) => ({
        type: String(s?.["type"] ?? "idea").toLowerCase(),
        text: String(s?.["text"] ?? "").slice(0, 500).trim(),
        color: typeof s?.["color"] === "string" ? s["color"] : "",
        related: typeof s?.["related_node_id"] === "string" ? s["related_node_id"] : typeof s?.["related_node"] === "string" ? s["related_node"] : null,
      }))
      .filter((s) => s.text);
    if (!rows.length) return { ok: true as const, added: 0 };

    const R = 320;
    const inserts = rows.map((s, i) => {
      const a = (i / rows.length) * Math.PI * 2 - Math.PI / 2;
      const type = TYPE_COLOR[s.type] ? s.type : "idea";
      return {
        board_id: data.boardId,
        text: s.text,
        color: s.color || TYPE_COLOR[type] || "sky",
        x: focus.x + Math.cos(a) * R,
        y: focus.y + Math.sin(a) * R,
        is_ai: true,
        ai_type: type,
        status: "suggested",
        source_node_id: focus.id,
      };
    });
    const { data: created, error } = await supabase.from("nodes").insert(inserts).select("id");
    if (error || !created) {
      console.error(error);
      return { ok: false as const, error: "save" as const, added: 0 };
    }
    const links = created.flatMap((n, i) => {
      const out = [{ board_id: data.boardId, from_node: focus.id, to_node: n.id, is_ai: true }];
      const rel = rows[i]?.related;
      if (rel && ids.has(rel) && rel !== focus.id) out.push({ board_id: data.boardId, from_node: n.id, to_node: rel, is_ai: true });
      return out;
    });
    await supabase.from("connections").insert(links);
    return { ok: true as const, added: created.length };
  });
