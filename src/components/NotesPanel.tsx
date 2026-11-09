import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Check, FileText, ListTodo, Loader2, Network, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { insightsEnabled, requestNoteInsights } from "@/lib/insights.functions";
import type { Insight, InsightType } from "@/lib/normalizeInsights";

const INSIGHT_COLOR: Record<InsightType, string> = { idea: "lime", question: "sky", connection: "lilac", perspective: "peach" };
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { bubbleBg, PALETTE, randomColor } from "@/components/brand";
import { useI18n } from "@/lib/i18n";
import type { Note, Todo, Node } from "@/lib/useBoard";
import { cn } from "@/lib/utils";
import { SyncedInput, SyncedTextarea, SyncedTitle, useAutoGrow } from "@/components/SyncedField";
import { estimateBubbleSize, findFreeSpot, bubbleSizes, pendingReveal, visibleArea } from "@/lib/placement";
import type { TKey } from "@/lib/i18n";

const INSIGHT_LABEL: Record<InsightType, TKey> = { idea: "aiIdea", question: "aiQuestion", connection: "aiConnection", perspective: "aiPerspective" };

// Insight edit box: grows to fit its text up to ~8 lines, then scrolls.
function InsightBox({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const ref = useAutoGrow(value, 8 * 20 + 16);
  return (
    <textarea
      ref={ref}
      dir="auto"
      rows={2}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full resize-none rounded-lg bg-card/60 p-2 text-sm leading-5 outline-none"
    />
  );
}

export function TodoCheck({ done, onToggle, disabled }: { done: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-lg border-2 transition-all",
        done ? "border-success bg-success text-success-foreground scale-105" : "border-border bg-card hover:border-success",
      )}
    >
      {done && <Check className="size-4" strokeWidth={3.5} />}
    </button>
  );
}

export function NotesPanel(props: {
  boardId: string;
  canEdit: boolean;
  notes: Note[];
  setNotes: Dispatch<SetStateAction<Note[]>>;
  todos: Todo[];
  setTodos: Dispatch<SetStateAction<Todo[]>>;
  nodes: Node[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
}) {
  const { boardId, canEdit, notes, setNotes, todos, setTodos, nodes, setNodes } = props;
  const spotFor = (text: string, isAi: boolean) => {
    const existing = nodes.filter((x) => !x.deleted_at).map((x) => {
      const m = bubbleSizes.get(x.id) ?? estimateBubbleSize(x.text, x.is_ai);
      return { x: x.x, y: x.y, w: m.w, h: m.h };
    });
    const v = visibleArea.current;
    const opts = v ? { cx: (v.minX + v.maxX) / 2, cy: (v.minY + v.maxY) / 2, prefer: v } : {};
    return findFreeSpot(existing, estimateBubbleSize(text, isAi), opts);
  };
  const { t, lang } = useI18n();
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!active && notes[0]) setActive(notes[0].id);
  }, [notes, active]);
  const note = notes.find((n) => n.id === active);
  // On phones the editor sits below the list: bring it into view when the user picks or creates a note.
  const editorRef = useRef<HTMLElement>(null);
  const userPicked = useRef(false);
  useEffect(() => {
    if (!userPicked.current || !active) return;
    userPicked.current = false;
    if (window.matchMedia("(max-width: 767px)").matches) editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [active]);
  const pick = (id: string) => { userPicked.current = true; setActive(id); };
  const fetchInsights = useServerFn(requestNoteInsights);
  const checkInsights = useServerFn(insightsEnabled);
  const [insightsOn, setInsightsOn] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  useEffect(() => {
    if (!canEdit) return;
    checkInsights().then((r) => setInsightsOn(r.enabled)).catch(() => setInsightsOn(false));
  }, [canEdit, checkInsights]);
  useEffect(() => setInsights([]), [active]);

  const create = async (kind: "note" | "todo") => {
    const color = randomColor();
    const { data, error } = await supabase.from("notes").insert({ board_id: boardId, kind, color, title: kind === "todo" ? t("newTodo") : t("newNote") }).select().single();
    if (error) { toast.error(error.message); return; }
    setNotes((l) => (l.some((x) => x.id === data.id) ? l : [...l, data]));
    pick(data.id);
  };
  const patchNote = async (id: string, p: Partial<Note>) => {
    setNotes((l) => l.map((n) => (n.id === id ? { ...n, ...p } : n)));
    const { error } = await supabase.from("notes").update({ ...p, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message);
  };
  const removeNote = async (id: string) => {
    setNotes((l) => l.filter((n) => n.id !== id));
    setActive(null);
    await supabase.from("notes").delete().eq("id", id);
  };
  const toMap = async (n: Note) => {
    const text = n.title || n.content.slice(0, 80) || "…";
    const p = spotFor(text, false);
    const { data, error } = await supabase
      .from("nodes")
      .insert({ board_id: boardId, text, color: n.color, note_id: n.id, x: p.x, y: p.y })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setNodes((l) => (l.some((x) => x.id === data.id) ? l : [...l, data]));
    pendingReveal.ids = [data.id];
    toast.success(t("noteAddedToMap"));
  };
  const addTodo = async (text: string) => {
    if (!note || !text.trim()) return;
    const { data, error } = await supabase.from("todo_items").insert({ note_id: note.id, board_id: boardId, text: text.trim(), position: Date.now() % 1e9 }).select().single();
    if (error) { toast.error(error.message); return; }
    setTodos((l) => (l.some((x) => x.id === data.id) ? l : [...l, data]));
  };
  const patchTodo = async (id: string, p: Partial<Todo>) => {
    setTodos((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)));
    const { error } = await supabase.from("todo_items").update(p).eq("id", id);
    if (error) toast.error(error.message);
  };
  const removeTodo = async (id: string) => {
    setTodos((l) => l.filter((x) => x.id !== id));
    await supabase.from("todo_items").delete().eq("id", id);
  };

  const runInsights = async (n: Note) => {
    setLoadingInsights(true);
    setInsights([]);
    try {
      const r = await fetchInsights({ data: { boardId, noteId: n.id, language: lang } });
      if (!r.ok) { toast.error(r.error === "empty" ? t("insightsEmpty") : t("insightsError")); return; }
      if (!r.suggestions.length) { toast(t("noInsights")); return; }
      setInsights(r.suggestions);
    } catch {
      toast.error(t("insightsError"));
    } finally {
      setLoadingInsights(false);
    }
  };
  const addInsight = async (n: Note, i: number) => {
    const s = insights[i];
    if (!s || !s.text.trim()) return;
    const p = spotFor(s.text.trim(), true);
    const { data, error } = await supabase
      .from("nodes")
      .insert({ board_id: boardId, text: s.text.trim(), color: INSIGHT_COLOR[s.type], note_id: n.id, is_ai: true, ai_type: s.type, status: "accepted", x: p.x, y: p.y })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setNodes((l) => (l.some((x) => x.id === data.id) ? l : [...l, data]));
    setInsights((l) => l.filter((_, j) => j !== i));
    pendingReveal.ids = [...pendingReveal.ids, data.id];
    toast.success(t("insightAddedToMap"));
  };

  const items = note ? todos.filter((x) => x.note_id === note.id) : [];

  return (
    <div className="grid h-full content-start gap-4 overflow-y-auto p-4 md:content-stretch md:grid-cols-[280px_1fr] md:overflow-hidden">
      <aside className="flex max-h-[40dvh] min-h-0 flex-col gap-3 overflow-y-auto md:max-h-none">
        {canEdit && (
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={() => create("note")}><FileText /> {t("newNote")}</Button>
            <Button size="sm" variant="secondary" className="flex-1" onClick={() => create("todo")}><ListTodo /> TODO</Button>
          </div>
        )}
        {notes.length === 0 && <p className="text-sm text-muted-foreground">{t("noNotes")}</p>}
        {notes.map((n) => {
          const its = todos.filter((x) => x.note_id === n.id);
          return (
            <button
              key={n.id}
              onClick={() => pick(n.id)}
              className={cn("rounded-2xl p-3 text-start shadow-bubble transition-transform hover:-translate-y-0.5", active === n.id && "ring-4 ring-primary")}
              style={{ background: bubbleBg(n.color) }}
            >
              <div className="flex items-center gap-2 font-display font-semibold">
                {n.kind === "todo" ? <ListTodo className="size-4" /> : <FileText className="size-4" />}
                <span className="truncate">{n.title || "…"}</span>
              </div>
              {n.kind === "todo" ? (
                <p className="mt-1 text-xs opacity-70">{its.filter((x) => x.done).length}/{its.length} ✓</p>
              ) : (
                <p className="mt-1 line-clamp-2 text-xs opacity-70">{n.content}</p>
              )}
            </button>
          );
        })}
      </aside>

      <section ref={editorRef} className="min-h-0 scroll-mt-4 overflow-y-auto rounded-[2rem] bg-card p-6 shadow-bubble">
        {note ? (
          <div key={note.id} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <SyncedTitle
                value={note.title}
                readOnly={!canEdit}
                placeholder={t("title")}
                aria-label={t("title")}
                dir="auto"
                onSave={(v) => patchNote(note.id, { title: v })}
                className="block min-w-[min(100%,16rem)] flex-1 basis-64 break-words bg-transparent font-display text-3xl font-bold leading-tight outline-none"
              />
              {canEdit && (
                <>
                  <div className="flex flex-wrap gap-1">
                    {PALETTE.map((c) => (
                      <button key={c} aria-label={c} onClick={() => patchNote(note.id, { color: c })} className={cn("size-5 rounded-full", note.color === c && "ring-2 ring-foreground")} style={{ background: bubbleBg(c) }} />
                    ))}
                  </div>
                  {(() => {
                    const onMap = nodes.some((x) => x.note_id === note.id && !x.is_ai && !x.deleted_at);
                    return <Button size="sm" variant="outline" disabled={onMap} onClick={() => toMap(note)}><Network /> {onMap ? t("alreadyOnMap") : t("toMap")}</Button>;
                  })()}
                  {insightsOn && (
                    <Button size="sm" variant="secondary" disabled={loadingInsights} onClick={() => runInsights(note)}>
                      {loadingInsights ? <Loader2 className="animate-spin" /> : <Sparkles />} {t("insights")}
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" aria-label={t("delete")} onClick={() => removeNote(note.id)}><Trash2 className="text-destructive" /></Button>
                </>
              )}
            </div>
            {loadingInsights && <p className="text-sm text-muted-foreground">{t("analyzing")}</p>}
            {insights.length > 0 && (
              <div className="grid gap-2 lg:grid-cols-2">
                {insights.map((s, i) => (
                  <div key={i} className="flex min-w-0 flex-col gap-2 rounded-2xl p-3 shadow-bubble" style={{ background: bubbleBg(INSIGHT_COLOR[s.type]) }}>
                    <span className="text-xs font-bold opacity-70">{t(INSIGHT_LABEL[s.type])}</span>
                    <InsightBox
                      label={t("editInsight")}
                      value={s.text}
                      onChange={(v) => setInsights((l) => l.map((x, j) => (j === i ? { ...x, text: v } : x)))}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" className="h-auto min-h-8 whitespace-normal py-1 text-start" disabled={!s.text.trim()} onClick={() => addInsight(note, i)}><Plus /> {t("addInsightToMap")}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setInsights((l) => l.filter((_, j) => j !== i))}><X /> {t("dismiss")}</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {note.kind === "note" ? (
              <SyncedTextarea
                value={note.content}
                readOnly={!canEdit}
                placeholder={t("write")}
                onSave={(v) => patchNote(note.id, { content: v })}
                className="min-h-[50vh] w-full resize-none bg-transparent text-lg leading-relaxed outline-none"
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((it) => (
                  <li key={it.id} className="group flex items-center gap-3 rounded-xl bg-muted px-3 py-2">
                    <TodoCheck done={it.done} disabled={!canEdit} onToggle={() => patchTodo(it.id, { done: !it.done })} />
                    <SyncedInput
                      value={it.text}
                      readOnly={!canEdit}
                      onSave={(v) => patchTodo(it.id, { text: v })}
                      className={cn("flex-1 bg-transparent outline-none", it.done && "text-muted-foreground line-through")}
                    />
                    {canEdit && (
                      <button aria-label={t("delete")} onClick={() => removeTodo(it.id)} className="opacity-0 group-hover:opacity-100"><X className="size-4" /></button>
                    )}
                  </li>
                ))}
                {canEdit && (
                  <li>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = e.currentTarget.elements.namedItem("task") as HTMLInputElement;
                        addTodo(f.value);
                        f.value = "";
                      }}
                      className="flex items-center gap-3 rounded-xl border-2 border-dashed border-border px-3 py-2"
                    >
                      <Plus className="size-5 text-muted-foreground" />
                      <input name="task" placeholder={t("addTask")} className="flex-1 bg-transparent outline-none" />
                    </form>
                  </li>
                )}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">{t("noNotes")}</p>
        )}
      </section>
    </div>
  );
}
