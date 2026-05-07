import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/destaques")({ component: AdminFeatured });

function AdminFeatured() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-featured"],
    queryFn: async () => (await supabase.from("featured_orders").select("*, restaurant:restaurants(name, featured_until)").order("created_at", { ascending: false })).data ?? [],
  });

  const approve = async (o: any) => {
    const newUntil = new Date(Math.max(Date.now(), o.restaurant?.featured_until ? new Date(o.restaurant.featured_until).getTime() : 0) + o.days * 86400000);
    const { error: e1 } = await supabase.from("featured_orders").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", o.id);
    const { error: e2 } = await supabase.from("restaurants").update({ featured_until: newUntil.toISOString() }).eq("id", o.restaurant_id);
    if (e1 || e2) return toast.error((e1 || e2)!.message);
    toast.success("Destaque aprovado");
    qc.invalidateQueries({ queryKey: ["admin-featured"] });
  };
  const reject = async (id: string) => {
    await supabase.from("featured_orders").update({ status: "rejected" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-featured"] });
  };

  return (
    <div className="space-y-3">
      <h1 className="font-display text-2xl font-bold">Pedidos de destaque</h1>
      {data?.map((o: any) => (
        <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{o.restaurant?.name}</p>
            <p className="text-xs text-muted-foreground">{o.plan} — R$ {Number(o.amount).toFixed(2)} · status: {o.status}</p>
          </div>
          {o.status === "pending" && (
            <>
              <Button size="sm" onClick={() => approve(o)} className="bg-success text-white"><Check className="mr-1 h-4 w-4" /> Aprovar</Button>
              <Button size="sm" variant="outline" onClick={() => reject(o.id)}><X className="mr-1 h-4 w-4" /> Recusar</Button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
