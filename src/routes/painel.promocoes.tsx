import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/painel/promocoes")({ component: PromoPanel });

function PromoPanel() {
  const { user } = useAuth(); const qc = useQueryClient();
  const { data: r } = useQuery({
    queryKey: ["my-r", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("restaurants").select("id").eq("owner_id", user!.id).maybeSingle()).data,
  });
  const { data: promos } = useQuery({
    queryKey: ["my-promos", r?.id], enabled: !!r?.id,
    queryFn: async () => (await supabase.from("promotions").select("*").eq("restaurant_id", r!.id).order("created_at", { ascending: false })).data ?? [],
  });
  const [f, setF] = useState({ title: "", description: "", discount: "", valid_until: "" });

  const add = async () => {
    if (!r || !f.title) return;
    const { error } = await supabase.from("promotions").insert({
      restaurant_id: r.id, title: f.title, description: f.description, discount: f.discount,
      valid_until: f.valid_until || null,
    });
    if (error) return toast.error(error.message);
    setF({ title: "", description: "", discount: "", valid_until: "" });
    qc.invalidateQueries({ queryKey: ["my-promos"] });
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Promoções</h1>
      <div className="grid gap-3 rounded-2xl border border-border/60 bg-card p-4">
        <div><Label>Título</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><Label>Descrição</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Desconto</Label><Input placeholder="20% OFF" value={f.discount} onChange={(e) => setF({ ...f, discount: e.target.value })} /></div>
          <div><Label>Válido até</Label><Input type="date" value={f.valid_until} onChange={(e) => setF({ ...f, valid_until: e.target.value })} /></div>
        </div>
        <Button onClick={add} className="bg-gradient-primary text-white"><Plus className="mr-2 h-4 w-4" /> Criar promoção</Button>
      </div>
      <div className="space-y-2">
        {promos?.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3">
            <div className="flex-1">
              <p className="font-semibold">{p.title}</p>
              <p className="text-xs text-muted-foreground">{p.discount} {p.valid_until && `· até ${new Date(p.valid_until).toLocaleDateString("pt-BR")}`}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={async () => { await supabase.from("promotions").delete().eq("id", p.id); qc.invalidateQueries({ queryKey: ["my-promos"] }); }}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
