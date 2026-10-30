import { Link } from "@tanstack/react-router";
import { Languages } from "lucide-react";
import { LANGS, useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Plumbob({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 64" className={cn("animate-plumbob drop-shadow", className)} aria-hidden>
      <defs>
        <linearGradient id="pb" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--primary-glow)" />
          <stop offset="1" stopColor="var(--primary)" />
        </linearGradient>
      </defs>
      <polygon points="20,0 40,24 20,64 0,24" fill="url(#pb)" />
      <polygon points="20,0 40,24 20,30" fill="var(--card)" opacity="0.35" />
      <polygon points="0,24 20,30 20,64" fill="var(--foreground)" opacity="0.12" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <Plumbob className="h-8 w-5" />
      <span className="font-display text-2xl font-bold tracking-tight">
        Idea<span className="text-primary">Verse</span>
      </span>
    </Link>
  );
}

export function LangSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <label className="flex items-center gap-1 rounded-full border-2 border-border bg-card px-3 py-1 text-sm">
      <Languages className="size-4 text-muted-foreground" />
      <select
        aria-label="Language"
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="cursor-pointer bg-transparent font-medium outline-none"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export const PALETTE = ["sky", "mint", "sun", "peach", "rose", "lilac", "lime"] as const;
export function bubbleBg(color: string) {
  if ((PALETTE as readonly string[]).includes(color)) return `var(--bubble-${color})`;
  if (/^#[0-9a-f]{3,8}$/i.test(color)) return color;
  return "var(--bubble-sky)";
}

export function randomColor(): string {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)] ?? "sky";
}
