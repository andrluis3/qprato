import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/restaurantes")({ component: AdminRestaurants });

function AdminRestaurants() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-restaurants"],
    queryFn: async () => (await supabase.from("restaurants").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const setStatus = async (id: string, status: "active" | "disabled" | "pending") => {
    const { error } = await supabase.from("restaurants").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Atualizado");
    qc.invalidateQueries({ queryKey: ["admin-restaurants"] });
  };
  const setDelinquent = async (id: string, delinquent: boolean) => {
    await supabase.from("restaurants").update({ delinquent }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-restaurants"] });
  };

  return (
    <div className="space-y-3">
      <h1 className="font-display text-2xl font-bold">Restaurantes</h1>
      {data?.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{r.name}</p>
            <p className="text-xs text-muted-foreground">{r.city} · status: <span className="capitalize">{r.status}</span> {r.delinquent && "· inadimplente"}</p>
          </div>
          {r.status === "pending" && (
            <>
              <Button size="sm" onClick={() => setStatus(r.id, "active")} className="bg-success text-white"><Check className="mr-1 h-4 w-4" /> Aprovar</Button>
              <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "disabled")}><X className="mr-1 h-4 w-4" /> Recusar</Button>
            </>
          )}
          {r.status === "active" && <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "disabled")}><Power className="mr-1 h-4 w-4" /> Desativar</Button>}
          {r.status === "disabled" && <Button size="sm" onClick={() => setStatus(r.id, "active")} className="bg-gradient-primary text-white"><Power className="mr-1 h-4 w-4" /> Ativar</Button>}
          <Button size="sm" variant="ghost" onClick={() => setDelinquent(r.id, !r.delinquent)}>
            {r.delinquent ? "Marcar em dia" : "Marcar inadimplente"}
          </Button>
        </div>
      ))}
    </div>
  );
}
