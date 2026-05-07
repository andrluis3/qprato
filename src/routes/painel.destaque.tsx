import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/painel/destaque")({ component: FeaturedPanel });

const PLANS = [
  { plan: "7 dias", days: 7, amount: 49.9 },
  { plan: "15 dias", days: 15, amount: 89.9 },
  { plan: "30 dias", days: 30, amount: 149.9 },
];

function FeaturedPanel() {
  const { user } = useAuth(); const qc = useQueryClient();
  const { data: r } = useQuery({
    queryKey: ["my-r", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("restaurants").select("id, featured_until").eq("owner_id", user!.id).maybeSingle()).data,
  });
  const { data: orders } = useQuery({
    queryKey: ["my-featured", r?.id], enabled: !!r?.id,
    queryFn: async () => (await supabase.from("featured_orders").select("*").eq("restaurant_id", r!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const buy = async (p: typeof PLANS[number]) => {
    if (!r) return;
    const { error } = await supabase.from("featured_orders").insert({ restaurant_id: r.id, plan: p.plan, days: p.days, amount: p.amount });
    if (error) return toast.error(error.message);
    toast.success("Pedido enviado para aprovação");
    qc.invalidateQueries({ queryKey: ["my-featured"] });
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Comprar destaque</h1>
      <p className="text-muted-foreground">Apareça em destaque na home e nas buscas.</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {PLANS.map((p) => (
          <div key={p.plan} className="rounded-2xl border border-border/60 bg-card p-5">
            <Sparkles className="h-6 w-6 text-accent" />
            <h3 className="mt-2 font-display text-xl font-bold">{p.plan}</h3>
            <p className="mt-1 text-2xl font-bold text-gradient-primary">R$ {p.amount.toFixed(2)}</p>
            <Button onClick={() => buy(p)} className="mt-4 w-full bg-gradient-primary text-white">Comprar</Button>
          </div>
        ))}
      </div>
      <h2 className="mt-6 font-display text-xl font-bold">Meus pedidos</h2>
      <div className="space-y-2">
        {orders?.map((o) => (
          <div key={o.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card p-3 text-sm">
            <span>{o.plan} — R$ {Number(o.amount).toFixed(2)}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${o.status === "approved" ? "bg-success/20 text-success" : o.status === "rejected" ? "bg-destructive/20 text-destructive" : "bg-muted"}`}>{o.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
