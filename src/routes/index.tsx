import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, ListChecks, Move, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LangSwitcher, Logo, Plumbob } from "@/components/brand";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IdeaVerse – AI Creative Thinking Universe" },
      { name: "description", content: "Colorful mind maps, notes, TODOs and an AI brainstorming partner — in English, Hebrew and Arabic." },
      { property: "og:title", content: "IdeaVerse – AI Creative Thinking Universe" },
      { property: "og:description", content: "Colorful mind maps, notes, TODOs and an AI brainstorming partner." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const DEMO = [
  { t: "🌱 Rooftop garden", c: "var(--bubble-mint)", x: "8%", y: "18%", d: "0s" },
  { t: "What if bees could vote?", c: "var(--bubble-sky)", x: "52%", y: "6%", d: ".6s" },
  { t: "Solar umbrellas", c: "var(--bubble-sun)", x: "60%", y: "52%", d: "1.2s" },
  { t: "✨ Community swap day", c: "var(--bubble-lilac)", x: "12%", y: "62%", d: ".3s" },
];

function Index() {
  const { t } = useI18n();
  const feats = [
    { icon: Move, label: t("feat1"), c: "var(--bubble-sky)" },
    { icon: ListChecks, label: t("feat2"), c: "var(--bubble-mint)" },
    { icon: Sparkles, label: t("feat3"), c: "var(--bubble-lilac)" },
    { icon: Users, label: t("feat4"), c: "var(--bubble-peach)" },
  ];
  return (
    <div className="min-h-screen bg-sky-gradient">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <LangSwitcher />
      </header>
      <main className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-8 md:grid-cols-2">
        <div>
          <p className="mb-3 inline-block rounded-full bg-card px-4 py-1 text-sm font-semibold text-primary shadow-bubble">
            {t("tagline")}
          </p>
          <h1 className="text-5xl font-bold leading-tight md:text-6xl">{t("heroTitle")}</h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">{t("heroBody")}</p>
          <div className="mt-8">
            <Button asChild variant="hero" size="lg">
              <Link to="/boards">{t("getStarted")}</Link>
            </Button>
          </div>
          <ul className="mt-10 grid grid-cols-2 gap-3">
            {feats.map(({ icon: Icon, label, c }) => (
              <li key={label} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-bubble">
                <span className="grid size-9 place-items-center rounded-full" style={{ background: c }}>
                  <Icon className="size-4" />
                </span>
                <span className="text-sm font-medium">{label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative h-[420px] rounded-[2.5rem] canvas-dots shadow-bubble">
          <svg className="absolute inset-0 h-full w-full" aria-hidden>
            <path d="M120 110 Q 260 60 360 70" stroke="var(--foreground)" strokeOpacity=".25" strokeWidth="3" fill="none" strokeDasharray="6 6" />
            <path d="M120 110 Q 150 230 140 290" stroke="var(--foreground)" strokeOpacity=".25" strokeWidth="3" fill="none" />
            <path d="M140 290 Q 300 300 400 250" stroke="var(--foreground)" strokeOpacity=".25" strokeWidth="3" fill="none" />
          </svg>
          {DEMO.map((b) => (
            <div
              key={b.t}
              className="absolute animate-float-soft rounded-full px-5 py-3 font-display text-lg font-semibold shadow-bubble"
              style={{ background: b.c, left: b.x, top: b.y, animationDelay: b.d }}
            >
              {b.t}
            </div>
          ))}
          <Plumbob className="absolute bottom-6 end-8 h-16 w-10" />
        </div>
      </main>
    </div>
  );
}
