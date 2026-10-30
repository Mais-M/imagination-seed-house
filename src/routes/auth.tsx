import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LangSwitcher, Logo, Plumbob } from "@/components/brand";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in – IdeaVerse" },
      { name: "description", content: "Sign in to IdeaVerse with Google to reach your boards." },
      { property: "og:title", content: "Sign in – IdeaVerse" },
      { property: "og:description", content: "Sign in to IdeaVerse with Google." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/boards", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/boards", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const signIn = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (result.error) {
      toast.error(String(result.error.message ?? result.error));
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/boards", replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-sky-gradient">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <LangSwitcher />
      </header>
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-sm animate-bubble-pop rounded-[2rem] bg-card p-8 text-center shadow-bubble">
          <Plumbob className="mx-auto mb-4 h-16 w-10" />
          <h1 className="text-3xl font-bold">IdeaVerse</h1>
          <p className="mt-2 text-muted-foreground">{t("tagline")}</p>
          <Button className="mt-6 w-full" size="lg" onClick={signIn} disabled={busy}>
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
              <path fill="currentColor" d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1a5.98 5.98 0 0 1 0-11.96c1.84 0 3.07.78 3.78 1.46l2.58-2.48C16.73 3.68 14.6 2.7 12 2.7a9.3 9.3 0 1 0 0 18.6c5.37 0 8.93-3.77 8.93-9.08 0-.61-.07-1.08-.16-1.54z" />
            </svg>
            {t("signInGoogle")}
          </Button>
        </div>
      </main>
    </div>
  );
}
