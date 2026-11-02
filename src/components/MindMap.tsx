import { useEffect, useRef, useState, type Dispatch, type SetStateAction, type PointerEvent as RPE } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArchiveRestore, Check, Redo2, RotateCcw, Undo2, GitBranch, Link2, ListPlus, Loader2, Maximize, Minus, Plus, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { bubbleBg, PALETTE, randomColor } from "@/components/brand";
import { useI18n, type TKey } from "@/lib/i18n";
import { requestBrainstorm } from "@/lib/brainstorm.functions";
import type { Conn, Node, Note } from "@/lib/useBoard";
import { cn } from "@/lib/utils";
import { bubbleSizes, visibleArea } from "@/lib/placement";

type View = { x: number; y: number; k: number };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const TYPE_LABEL: Record<string, TKey> = { idea: "aiIdea", question: "aiQuestion", connection: "aiConnection", perspective: "aiPerspective" };

function upsert<T extends { id: string }>(list: T[], row: T) {
  return list.some((x) => x.id === row.id) ? list.map((x) => (x.id === row.id ? row : x)) : [...list, row];
}

export function MindMap(props: {
  boardId: string;
  userId: string;
  canEdit: boolean;
  nodes: Node[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  conns: Conn[];
  setConns: Dispatch<SetStateAction<Conn[]>>;
  notes: Note[];
}) {
  const { boardId, canEdit, nodes, setNodes, conns, setConns, notes } = props;
  const { t, lang } = useI18n();
  const brainstorm = useServerFn(requestBrainstorm);
  const wrap = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;
  // Publish the visible map area (below the floating toolbar, above the zoom controls) for new-bubble placement.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const bar = el.parentElement?.querySelector<HTMLElement>("[data-map-toolbar]");
    const top = bar ? bar.offsetTop + bar.offsetHeight + 8 : 76;
    const bottom = 70, side = 12;
    visibleArea.current = {
      minX: (side - view.x) / view.k,
      maxX: (el.clientWidth - side - view.x) / view.k,
      minY: (top - view.y) / view.k,
      maxY: (el.clientHeight - bottom - view.y) / view.k,
    };
  }, [view, selected]);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const drag = useRef<{ kind: "node" | "pan"; id?: string; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);

  // center initially
  useEffect(() => {
    const el = wrap.current;
    if (el) setView({ x: el.clientWidth / 2, y: el.clientHeight / 2, k: 1 });
  }, []);

  // wheel zoom (non-passive)
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const v = viewRef.current;
      const next = clamp(v.k * Math.exp(-dy * 0.0015), 0.25, 2.5);
      const r = el.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      const f = next / v.k;
      setView({ k: next, x: px - (px - v.x) * f, y: py - (py - v.y) * f });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = (f: number) => {
    const el = wrap.current!;
    const px = el.clientWidth / 2, py = el.clientHeight / 2;
    setView((v) => {
      const k = clamp(v.k * f, 0.25, 2.5);
      const r = k / v.k;
      return { k, x: px - (px - v.x) * r, y: py - (py - v.y) * r };
    });
  };

  const toWorld = (cx: number, cy: number) => {
    const r = wrap.current!.getBoundingClientRect();
    const v = viewRef.current;
    return { x: (cx - r.left - v.x) / v.k, y: (cy - r.top - v.y) / v.k };
  };

  // ---- history (undo / redo) ----
  type Entry = { undo: () => Promise<void>; redo: () => Promise<void> };
  const past = useRef<Entry[]>([]);
  const future = useRef<Entry[]>([]);
  const [, bump] = useState(0);
  const push = (e: Entry) => {
    past.current.push(e);
    if (past.current.length > 100) past.current.shift();
    future.current = [];
    bump((x) => x + 1);
  };
  const undo = async () => {
    const e = past.current.pop();
    if (!e) return void toast.message(t("nothingToUndo"));
    await e.undo();
    future.current.push(e);
    bump((x) => x + 1);
  };
  const redo = async () => {
    const e = future.current.pop();
    if (!e) return void toast.message(t("nothingToRedo"));
    await e.redo();
    past.current.push(e);
    bump((x) => x + 1);
  };
  const undoRef = useRef(undo);
  undoRef.current = undo;
  const redoRef = useRef(redo);
  redoRef.current = redo;
  useEffect(() => {
    if (!canEdit) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) { e.preventDefault(); undoRef.current(); }
      else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); redoRef.current(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canEdit]);

  // raw writes (no history)
  const writeNode = async (id: string, patch: Partial<Node>) => {
    setNodes((l) => l.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    const { error } = await supabase.from("nodes").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message);
  };
  const writeConn = async (id: string, patch: Partial<Conn>) => {
    setConns((l) => l.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const { error } = await supabase.from("connections").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  };

  const addNode = async (x: number, y: number, text = t("addIdea")): Promise<string | undefined> => {
    if (!canEdit) return undefined;
    const color = randomColor();
    const { data, error } = await supabase.from("nodes").insert({ board_id: boardId, text, color, x, y }).select().single();
    if (error) { toast.error(error.message); return; }
    setNodes((l) => upsert(l, data));
    setSelected(data.id);
    setEditing(data.id);
    const id = data.id as string;
    push({ undo: () => writeNode(id, { deleted_at: new Date().toISOString() }), redo: () => writeNode(id, { deleted_at: null }) });
    return id;
  };

  const addBranch = async (parent: Node) => {
    const a = Math.random() * Math.PI * 2;
    const id = await addNode(parent.x + Math.cos(a) * 200, parent.y + Math.sin(a) * 160);
    if (id) await connect(parent.id, id);
  };

  // recorded update: remembers previous values of the changed fields
  const updateNode = async (id: string, patch: Partial<Node>, prevOverride?: Partial<Node>) => {
    const cur = nodes.find((n) => n.id === id);
    if (cur) {
      const prev = prevOverride ?? (Object.fromEntries(Object.keys(patch).map((k) => [k, cur[k as keyof Node]])) as Partial<Node>);
      push({ undo: () => writeNode(id, prev), redo: () => writeNode(id, patch) });
    }
    await writeNode(id, patch);
  };

  const restoreNode = async (id: string) => {
    await writeNode(id, { deleted_at: null });
    toast.success(t("ideaRestored"));
  };

  // soft delete: keeps content, color, position, connections for restore
  const deleteNode = async (id: string) => {
    setSelected(null);
    const entry: Entry = { undo: () => writeNode(id, { deleted_at: null }), redo: () => writeNode(id, { deleted_at: new Date().toISOString() }) };
    push(entry);
    await entry.redo();
    toast(t("ideaDeleted"), { action: { label: t("undo"), onClick: () => undoRef.current() } });
  };

  // pending AI suggestions that are dismissed are discarded (never kept)
  const dismissSuggestion = async (id: string) => {
    setNodes((l) => l.filter((n) => n.id !== id));
    setConns((l) => l.filter((c) => c.from_node !== id && c.to_node !== id));
    setSelected(null);
    await supabase.from("connections").delete().or(`from_node.eq.${id},to_node.eq.${id}`);
    const { error } = await supabase.from("nodes").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  const connect = async (a: string, b: string) => {
    if (a === b) return;
    const same = (c: Conn) => (c.from_node === a && c.to_node === b) || (c.from_node === b && c.to_node === a);
    if (conns.some((c) => same(c) && !c.deleted_at)) return;
    const old = conns.find((c) => same(c) && c.deleted_at);
    let id: string;
    if (old) {
      id = old.id;
      await writeConn(id, { deleted_at: null });
    } else {
      const { data, error } = await supabase.from("connections").insert({ board_id: boardId, from_node: a, to_node: b }).select().single();
      if (error) { toast.error(error.message); return; }
      setConns((l) => upsert(l, data));
      id = data.id;
    }
    push({ undo: () => writeConn(id, { deleted_at: new Date().toISOString() }), redo: () => writeConn(id, { deleted_at: null }) });
  };

  const deleteConn = async (id: string) => {
    if (!canEdit) return;
    const entry: Entry = { undo: () => writeConn(id, { deleted_at: null }), redo: () => writeConn(id, { deleted_at: new Date().toISOString() }) };
    push(entry);
    await entry.redo();
  };

  const makeTodo = async (node: Node) => {
    let list = notes.find((n) => n.kind === "todo" && n.title === t("fromMap"));
    if (!list) {
      const { data, error } = await supabase.from("notes").insert({ board_id: boardId, kind: "todo", title: t("fromMap"), color: "mint" }).select().single();
      if (error) { toast.error(error.message); return; }
      list = data;
    }
    const { error } = await supabase.from("todo_items").insert({ note_id: list.id, board_id: boardId, text: node.text, position: Date.now() % 1e9 });
    if (error) { toast.error(error.message); return; }
    toast.success(t("addedToTodo"));
  };

  const runAI = async (id: string) => {
    setAiBusy(true);
    try {
      const r = await brainstorm({ data: { boardId, focusNodeId: id, language: lang, requestType: "expand", view: visibleArea.current ?? undefined } });
      if (!r.ok) toast.error(r.error === "not_configured" ? t("aiNotConfigured") : t("aiError"));
      else if (r.added === 0) toast.message(t("aiEmpty"));
      else toast.success(`✨ ${r.added} ${t("aiAdded")}`);
    } catch {
      toast.error(t("aiError"));
    } finally {
      setAiBusy(false);
    }
  };

  // pointer handling
  const onBgDown = (e: RPE) => {
    if (e.button !== 0) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { kind: "pan", sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y, moved: false };
  };
  const onNodeDown = (e: RPE, n: Node) => {
    e.stopPropagation();
    if (e.button !== 0 || editing === n.id) return;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { kind: "node", id: n.id, sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y, moved: false };
  };
  const onMove = (e: RPE) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    if (d.kind === "pan") setView((v) => ({ ...v, x: d.ox + dx, y: d.oy + dy }));
    else if (canEdit && d.moved) {
      const k = viewRef.current.k;
      setNodes((l) => l.map((n) => (n.id === d.id ? { ...n, x: d.ox + dx / k, y: d.oy + dy / k } : n)));
    }
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.kind === "pan") {
      if (!d.moved) {
        setSelected(null);
        setConnectFrom(null);
      }
      return;
    }
    const n = nodes.find((x) => x.id === d.id);
    if (!n) return;
    if (d.moved && canEdit) {
      updateNode(n.id, { x: n.x, y: n.y }, { x: d.ox, y: d.oy });
    } else if (connectFrom && connectFrom !== n.id) {
      connect(connectFrom, n.id);
      setConnectFrom(null);
      setSelected(n.id);
    } else setSelected(n.id);
  };

  const live = nodes.filter((n) => !n.deleted_at);
  const cutoff = Date.now() - 30 * 864e5;
  const trash = nodes
    .filter((n) => n.deleted_at && new Date(n.deleted_at).getTime() > cutoff)
    .sort((a, b) => (b.deleted_at! > a.deleted_at! ? 1 : -1));
  const byId = new Map(live.map((n) => [n.id, n]));
  const sel = selected ? byId.get(selected) : undefined;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        ref={wrap}
        className="canvas-dots absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onBgDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onDoubleClick={(e) => {
          if (e.target !== e.currentTarget) return;
          const p = toWorld(e.clientX, e.clientY);
          addNode(p.x, p.y);
        }}
      >
        <div className="pointer-events-none absolute left-0 top-0" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, transformOrigin: "0 0" }}>
          <svg className="absolute overflow-visible" style={{ left: 0, top: 0, width: 1, height: 1 }}>
            {conns.filter((c) => !c.deleted_at).map((c) => {
              const a = byId.get(c.from_node), b = byId.get(c.to_node);
              if (!a || !b) return null;
              const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 30;
              const d = `M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`;
              return (
                <g key={c.id} className="pointer-events-auto cursor-pointer" onDoubleClick={() => deleteConn(c.id)}>
                  <path d={d} stroke="transparent" strokeWidth={16} fill="none" />
                  <path d={d} stroke={c.is_ai ? "var(--ai)" : "var(--foreground)"} strokeOpacity={c.is_ai ? 0.55 : 0.3} strokeWidth={3} strokeDasharray={c.is_ai ? "7 7" : undefined} fill="none" strokeLinecap="round" />
                </g>
              );
            })}
          </svg>
          {live.map((n) => {
            const suggested = n.status === "suggested";
            const isSel = n.id === selected;
            return (
              <div
                key={n.id}
                className="pointer-events-auto absolute"
                style={{ left: n.x, top: n.y, transform: "translate(-50%, -50%)" }}
                onPointerDown={(e) => onNodeDown(e, n)}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (canEdit) setEditing(n.id);
                }}
              >
                <div
                  ref={(el) => { if (el) bubbleSizes.set(n.id, { w: el.offsetWidth, h: el.offsetHeight }); }}
                  className={cn(
                    "relative animate-bubble-pop w-max max-w-[280px] min-w-[110px] cursor-pointer rounded-[1.75rem] px-5 py-3 text-center font-display text-base font-medium leading-snug shadow-bubble transition-shadow",
                    suggested && "border-[3px] border-dashed border-ai opacity-95",
                    isSel && "ring-4 ring-primary ring-offset-2 ring-offset-canvas",
                    connectFrom === n.id && "ring-4 ring-ai",
                  )}
                  style={{ background: bubbleBg(n.color) }}
                >
                  {n.is_ai && (
                    <span className="absolute -top-3 start-3 flex items-center gap-1 rounded-full bg-ai px-2 py-0.5 text-[10px] font-bold uppercase text-destructive-foreground">
                      <Sparkles className="size-3" /> {t(TYPE_LABEL[n.ai_type ?? "idea"] ?? "aiIdea")}
                    </span>
                  )}
                  {editing === n.id ? (
                    <textarea
                      autoFocus
                      onFocus={(e) => e.currentTarget.select()}
                      defaultValue={n.text}
                      onPointerDown={(e) => e.stopPropagation()}
                      onBlur={(e) => {
                        setEditing(null);
                        const v = e.target.value.trim();
                        if (v && v !== n.text) updateNode(n.id, { text: v });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) (e.target as HTMLTextAreaElement).blur();
                        if (e.key === "Escape") setEditing(null);
                      }}
                      className="w-48 resize-none bg-transparent text-center outline-none"
                      rows={2}
                    />
                  ) : (
                    <span className="whitespace-pre-wrap break-words">{n.text}</span>
                  )}
                  {suggested && canEdit && (
                    <div className="mt-2 flex justify-center gap-1">
                      <button onPointerDown={(e) => e.stopPropagation()} onClick={() => updateNode(n.id, { status: "accepted" })} className="flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-xs font-semibold text-success-foreground">
                        <Check className="size-3" /> {t("accept")}
                      </button>
                      <button onPointerDown={(e) => e.stopPropagation()} onClick={() => dismissSuggestion(n.id)} className="flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-xs font-semibold">
                        <X className="size-3" /> {t("dismiss")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* toolbar */}
      <div data-map-toolbar className="pointer-events-none absolute inset-x-0 top-3 flex flex-wrap items-center justify-center gap-2 px-3">
        {canEdit && (
          <Button className="pointer-events-auto" onClick={() => { const p = toWorld(wrap.current!.getBoundingClientRect().left + wrap.current!.clientWidth / 2, wrap.current!.getBoundingClientRect().top + wrap.current!.clientHeight / 2); addNode(p.x + (Math.random() - 0.5) * 80, p.y + (Math.random() - 0.5) * 80); }}>
            <Plus /> {t("addIdea")}
          </Button>
        )}
        {canEdit && (
          <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-card p-1 shadow-bubble">
            <Button variant="ghost" size="icon" aria-label={t("undo")} title={`${t("undo")} (Ctrl+Z)`} disabled={!past.current.length} onClick={undo}><Undo2 className="rtl:-scale-x-100" /></Button>
            <Button variant="ghost" size="icon" aria-label={t("redo")} title={`${t("redo")} (Ctrl+Y)`} disabled={!future.current.length} onClick={redo}><Redo2 className="rtl:-scale-x-100" /></Button>
            <Button variant={showTrash ? "secondary" : "ghost"} size="sm" aria-label={t("recentlyDeleted")} onClick={() => setShowTrash((v) => !v)}>
              <ArchiveRestore /> <span className="hidden sm:inline">{t("recentlyDeleted")}</span>{trash.length > 0 && <span className="rounded-full bg-muted px-1.5 text-xs">{trash.length}</span>}
            </Button>
          </div>
        )}
        {sel && canEdit && (
          <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-full bg-card p-1 shadow-bubble animate-bubble-pop">
            <Button variant="ai" size="sm" disabled={aiBusy || sel.status === "suggested"} onClick={() => runAI(sel.id)}>
              {aiBusy ? <Loader2 className="animate-spin" /> : <Sparkles />} {t("expandAI")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => addBranch(sel)}>
              <GitBranch /> {t("branch")}
            </Button>
            <Button variant={connectFrom ? "secondary" : "ghost"} size="sm" onClick={() => setConnectFrom(connectFrom ? null : sel.id)}>
              <Link2 /> {t("connect")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => makeTodo(sel)}>
              <ListPlus /> {t("toTodo")}
            </Button>
            <div className="flex gap-1 px-1">
              {PALETTE.map((c) => (
                <button key={c} aria-label={c} onClick={() => updateNode(sel.id, { color: c })} className={cn("size-5 rounded-full border-2 border-card", sel.color === c && "ring-2 ring-foreground")} style={{ background: bubbleBg(c) }} />
              ))}
            </div>
            <Button variant="ghost" size="icon" aria-label={t("delete")} onClick={() => deleteNode(sel.id)}>
              <Trash2 className="text-destructive" />
            </Button>
          </div>
        )}
      </div>

      {showTrash && canEdit && (
        <div className="absolute end-3 top-16 z-10 flex max-h-[70%] w-80 flex-col rounded-3xl bg-card p-3 shadow-bubble animate-bubble-pop">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">{t("recentlyDeleted")}</h3>
            <Button variant="ghost" size="icon" aria-label={t("dismiss")} onClick={() => setShowTrash(false)}><X /></Button>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">{t("deletedHint")}</p>
          <div className="flex flex-col gap-2 overflow-y-auto">
            {trash.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">{t("deletedEmpty")}</p>}
            {trash.map((n) => (
              <div key={n.id} className="flex items-center gap-2 rounded-2xl p-2" style={{ background: bubbleBg(n.color) }}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-1">
                    {n.is_ai && <span className="flex items-center gap-1 rounded-full bg-ai px-1.5 text-[10px] font-bold uppercase text-destructive-foreground"><Sparkles className="size-3" />{t(TYPE_LABEL[n.ai_type ?? "idea"] ?? "aiIdea")}</span>}
                    {n.status === "suggested" && <span className="rounded-full bg-card px-1.5 text-[10px] font-bold uppercase">{t("pendingTag")}</span>}
                  </div>
                  <p className="truncate text-sm font-medium">{n.text}</p>
                  <p className="text-[10px] opacity-70">{new Date(n.deleted_at!).toLocaleString(lang)}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => restoreNode(n.id)}><RotateCcw /> {t("restore")}</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {connectFrom && <div className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded-full bg-ai px-4 py-2 text-sm font-semibold text-destructive-foreground shadow-bubble">{t("connectHint")}</div>}
      {aiBusy && (
        <div className="absolute bottom-16 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-semibold shadow-bubble">
          <Sparkles className="size-4 animate-spin text-ai" /> {t("aiThinking")}
        </div>
      )}

      <div className="absolute bottom-3 end-3 flex gap-1 rounded-full bg-card p-1 shadow-bubble">
        <Button variant="ghost" size="icon" aria-label={t("zoomOut")} onClick={() => zoomBy(1 / 1.2)}><Minus /></Button>
        <span className="grid w-12 place-items-center text-xs font-semibold">{Math.round(view.k * 100)}%</span>
        <Button variant="ghost" size="icon" aria-label={t("zoomIn")} onClick={() => zoomBy(1.2)}><Plus /></Button>
        <Button variant="ghost" size="icon" aria-label={t("resetView")} onClick={() => setView({ x: wrap.current!.clientWidth / 2, y: wrap.current!.clientHeight / 2, k: 1 })}><Maximize /></Button>
      </div>
      <p className="pointer-events-none absolute bottom-4 start-4 hidden max-w-md text-xs text-muted-foreground md:block">{t("canvasHint")}</p>
    </div>
  );
}
