import { useEffect, useRef, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

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

type Base = { value: string; onSave: (v: string) => void };

export function SyncedInput({ value, onSave, ...rest }: Base & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "onBlur" | "onFocus" | "defaultValue">) {
  const s = useSynced(value, onSave);
  return <input {...rest} {...s} />;
}

export function SyncedTextarea({ value, onSave, ...rest }: Base & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "onBlur" | "onFocus" | "defaultValue">) {
  const s = useSynced(value, onSave);
  return <textarea {...rest} {...s} />;
}
