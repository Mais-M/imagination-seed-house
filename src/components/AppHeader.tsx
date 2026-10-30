import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LangSwitcher, Logo } from "@/components/brand";
import { useI18n } from "@/lib/i18n";

export function AppHeader({ children }: { children?: ReactNode }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <header className="flex flex-wrap items-center gap-3 border-b-2 border-border bg-card/80 px-4 py-3 backdrop-blur">
      <Logo />
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      <LangSwitcher />
      <Button variant="ghost" size="sm" onClick={signOut}>
        <LogOut /> {t("signOut")}
      </Button>
    </header>
  );
}
