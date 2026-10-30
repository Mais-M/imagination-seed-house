import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Check, FileText, ListTodo, Network, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { bubbleBg, PALETTE, randomColor } from "@/components/brand";
import { useI18n } from "@/lib/i18n";
import type { Note, Todo, Node } from "@/lib/useBoard";
import { cn } from "@/lib/utils";

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
  setNodes: Dispatch<SetStateAction<Node[]>>;
}) {
  const { boardId, canEdit, notes, setNotes, todos, setTodos, setNodes } = props;
  const { t } = useI18n();
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!active && notes[0]) setActive(notes[0].id);
  }, [notes, active]);
  const note = notes.find((n) => n.id === active);

  const create = async (kind: "note" | "todo") => {
    const color = randomColor();
    const { data, error } = await supabase.from("notes").insert({ board_id: boardId, kind, color, title: kind === "todo" ? t("newTodo") : t("newNote") }).select().single();
    if (error) { toast.error(error.message); return; }
    setNotes((l) => (l.some((x) => x.id === data.id) ? l : [...l, data]));
    setActive(data.id);
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
    const { data, error } = await supabase
      .from("nodes")
      .insert({ board_id: boardId, text: n.title || n.content.slice(0, 80) || "…", color: n.color, note_id: n.id, x: (Math.random() - 0.5) * 300, y: (Math.random() - 0.5) * 300 })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setNodes((l) => (l.some((x) => x.id === data.id) ? l : [...l, data]));
    toast.success(t("addedToMap"));
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

  const items = note ? todos.filter((x) => x.note_id === note.id) : [];

  return (
    <div className="grid h-full gap-4 overflow-hidden p-4 md:grid-cols-[280px_1fr]">
      <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto">
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
              onClick={() => setActive(n.id)}
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

      <section className="min-h-0 overflow-y-auto rounded-[2rem] bg-card p-6 shadow-bubble">
        {note ? (
          <div key={note.id} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                defaultValue={note.title}
                readOnly={!canEdit}
                placeholder={t("title")}
                onBlur={(e) => e.target.value !== note.title && patchNote(note.id, { title: e.target.value })}
                className="min-w-0 flex-1 bg-transparent font-display text-3xl font-bold outline-none"
              />
              {canEdit && (
                <>
                  <div className="flex gap-1">
                    {PALETTE.map((c) => (
                      <button key={c} aria-label={c} onClick={() => patchNote(note.id, { color: c })} className={cn("size-5 rounded-full", note.color === c && "ring-2 ring-foreground")} style={{ background: bubbleBg(c) }} />
                    ))}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => toMap(note)}><Network /> {t("toMap")}</Button>
                  <Button size="icon" variant="ghost" aria-label={t("delete")} onClick={() => removeNote(note.id)}><Trash2 className="text-destructive" /></Button>
                </>
              )}
            </div>
            {note.kind === "note" ? (
              <textarea
                defaultValue={note.content}
                readOnly={!canEdit}
                placeholder={t("write")}
                onBlur={(e) => e.target.value !== note.content && patchNote(note.id, { content: e.target.value })}
                className="min-h-[50vh] w-full resize-none bg-transparent text-lg leading-relaxed outline-none"
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((it) => (
                  <li key={it.id} className="group flex items-center gap-3 rounded-xl bg-muted px-3 py-2">
                    <TodoCheck done={it.done} disabled={!canEdit} onToggle={() => patchTodo(it.id, { done: !it.done })} />
                    <input
                      defaultValue={it.text}
                      readOnly={!canEdit}
                      onBlur={(e) => e.target.value !== it.text && patchTodo(it.id, { text: e.target.value })}
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
