import { useEffect, useLayoutEffect, useRef, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

// Text field that shows live remote updates while not focused, and autosaves (debounced + on blur).
function useSynced(value: string, onSave: (v: string) => void, delay = 800) {
  const [local, setLocal] = useState(value);
  const focused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saved = useRef(value);
  useEffect(() => {
    if (!focused.current) setLocal(value);
    saved.current = value;
  }, [value]);
  const flush = (v: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (v !== saved.current) { saved.current = v; onSave(v); }
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return {
    value: local,
    onFocus: () => { focused.current = true; },
    onChange: (e: { target: { value: string } }) => {
      const v = e.target.value;
      setLocal(v);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => flush(v), delay);
    },
    onBlur: () => { focused.current = false; flush(local); },
  };
}

// Grow a textarea to fit its content (optionally capped; scrolls past the cap).
export function useAutoGrow(value: string, maxPx?: number) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = "auto";
      const h = el.scrollHeight + (el.offsetHeight - el.clientHeight);
      el.style.height = `${maxPx ? Math.min(h, maxPx) : h}px`;
      el.style.overflowY = maxPx && h > maxPx ? "auto" : "hidden";
    };
    fit();
    const ro = new ResizeObserver(() => fit());
    ro.observe(el.parentElement ?? el);
    return () => ro.disconnect();
  }, [value, maxPx]);
  return ref;
}

type Base = { value: string; onSave: (v: string) => void };

export function SyncedInput({ value, onSave, ...rest }: Base & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "onBlur" | "onFocus" | "defaultValue">) {
  const s = useSynced(value, onSave);
  return <input {...rest} {...s} />;
}

export function SyncedTextarea({ value, onSave, ...rest }: Base & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "onBlur" | "onFocus" | "defaultValue">) {
  const s = useSynced(value, onSave);
  return <textarea {...rest} {...s} />;
}

// Single-line value shown in a wrapping, auto-growing box. Enter saves (blurs); newlines are never stored.
export function SyncedTitle({ value, onSave, ...rest }: Base & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "onBlur" | "onFocus" | "defaultValue" | "rows">) {
  const s = useSynced(value, onSave);
  const ref = useAutoGrow(s.value);
  return (
    <textarea
      {...rest}
      ref={ref}
      rows={1}
      value={s.value}
      onFocus={s.onFocus}
      onBlur={s.onBlur}
      onChange={(e) => s.onChange({ target: { value: e.target.value.replace(/[\r\n]+/g, " ") } })}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
      style={{ resize: "none", overflow: "hidden", ...rest.style }}
    />
  );
}
