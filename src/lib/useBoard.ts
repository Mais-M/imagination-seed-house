import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Node = Tables<"nodes">;
export type Conn = Tables<"connections">;
export type Note = Tables<"notes">;
export type Todo = Tables<"todo_items">;
export type Board = Tables<"boards">;

type Row = { id: string };
function applyChange<T extends Row>(list: T[], p: { eventType: string; new: unknown; old: unknown }): T[] {
  if (p.eventType === "DELETE") {
    const id = (p.old as Row).id;
    return list.filter((x) => x.id !== id);
  }
  const row = p.new as T;
  const i = list.findIndex((x) => x.id === row.id);
  if (i === -1) return [...list, row];
  const copy = list.slice();
  copy[i] = row;
  return copy;
}

export function useBoard(boardId: string) {
  const [board, setBoard] = useState<Board | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [conns, setConns] = useState<Conn[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const [b, n, c, no, td, ce] = await Promise.all([
      supabase.from("boards").select("*").eq("id", boardId).maybeSingle(),
      supabase.from("nodes").select("*").eq("board_id", boardId),
      supabase.from("connections").select("*").eq("board_id", boardId),
      supabase.from("notes").select("*").eq("board_id", boardId).order("created_at"),
      supabase.from("todo_items").select("*").eq("board_id", boardId).order("position"),
      supabase.rpc("can_edit_board", { _board: boardId }),
    ]);
    setBoard(b.data ?? null);
    setNodes(n.data ?? []);
    setConns(c.data ?? []);
    setNotes(no.data ?? []);
    setTodos(td.data ?? []);
    setCanEdit(!!ce.data);
    setLoaded(true);
  }, [boardId]);

  useEffect(() => {
    reload();
    const f = `board_id=eq.${boardId}`;
    const ch = supabase
      .channel(`board-${boardId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "nodes", filter: f }, (p) => setNodes((l) => applyChange(l, p)))
      .on("postgres_changes", { event: "*", schema: "public", table: "connections", filter: f }, (p) => setConns((l) => applyChange(l, p)))
      .on("postgres_changes", { event: "*", schema: "public", table: "notes", filter: f }, (p) => setNotes((l) => applyChange(l, p)))
      .on("postgres_changes", { event: "*", schema: "public", table: "todo_items", filter: f }, (p) => setTodos((l) => applyChange(l, p)))
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [boardId, reload]);

  return { board, setBoard, nodes, setNodes, conns, setConns, notes, setNotes, todos, setTodos, canEdit, loaded, reload };
}
