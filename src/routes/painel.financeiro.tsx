import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/painel/financeiro")({ component: FinPanel });

function FinPanel() {
  const { user } = useAuth();
  const { data: r } = useQuery({
    queryKey: ["my-r", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("restaurants").select("id, delinquent").eq("owner_id", user!.id).maybeSingle()).data,
  });
  const { data: invoices } = useQuery({
    queryKey: ["my-invoices", r?.id], enabled: !!r?.id,
    queryFn: async () => (await supabase.from("invoices").select("*").eq("restaurant_id", r!.id).order("due_date", { ascending: false })).data ?? [],
  });
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Financeiro</h1>
      {r && (
        <div className={`rounded-xl border p-4 ${r.delinquent ? "border-destructive/40 bg-destructive/10" : "border-success/40 bg-success/10"}`}>
          <p className="font-semibold">{r.delinquent ? "Conta com pendências" : "Conta em dia"}</p>
        </div>
      )}
      <div className="space-y-2">
        {invoices?.map((i) => (
          <div key={i.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card p-3 text-sm">
            <div><p className="font-semibold">R$ {Number(i.amount).toFixed(2)}</p><p className="text-xs text-muted-foreground">Vence: {new Date(i.due_date).toLocaleDateString("pt-BR")}</p></div>
            <span className={`rounded-full px-2 py-0.5 text-xs ${i.status === "paid" ? "bg-success/20 text-success" : i.status === "overdue" ? "bg-destructive/20 text-destructive" : "bg-muted"}`}>{i.status}</span>
          </div>
        ))}
        {(!invoices || invoices.length === 0) && <p className="text-sm text-muted-foreground">Sem faturas.</p>}
      </div>
    </div>
  );
}
