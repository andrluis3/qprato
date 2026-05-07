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

export const Route = createFileRoute("/painel/cardapio")({ component: MenuPanel });

function MenuPanel() {
  const { user } = useAuth(); const qc = useQueryClient();
  const { data: r } = useQuery({
    queryKey: ["my-r", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("restaurants").select("id").eq("owner_id", user!.id).maybeSingle()).data,
  });
  const { data: items } = useQuery({
    queryKey: ["my-menu", r?.id], enabled: !!r?.id,
    queryFn: async () => (await supabase.from("menu_items").select("*").eq("restaurant_id", r!.id).order("created_at", { ascending: false })).data ?? [],
  });
  const [f, setF] = useState({ name: "", description: "", price: "", category: "", image_url: "" });

  const upload = async (file: File) => {
    if (!user) return;
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("menu-images").upload(path, file);
    if (error) return toast.error(error.message);
    setF({ ...f, image_url: supabase.storage.from("menu-images").getPublicUrl(path).data.publicUrl });
  };

  const add = async () => {
    if (!r || !f.name) return;
    const { error } = await supabase.from("menu_items").insert({
      restaurant_id: r.id, name: f.name, description: f.description,
      price: Number(f.price) || 0, category: f.category, image_url: f.image_url || null,
    });
    if (error) return toast.error(error.message);
    setF({ name: "", description: "", price: "", category: "", image_url: "" });
    qc.invalidateQueries({ queryKey: ["my-menu"] });
  };

  const remove = async (id: string) => {
    await supabase.from("menu_items").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-menu"] });
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Cardápio</h1>
      <div className="grid gap-3 rounded-2xl border border-border/60 bg-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div><Label>Nome</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
        </div>
        <div><Label>Descrição</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div><Label>Categoria</Label><Input placeholder="Pratos principais" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></div>
          <div><Label>Imagem</Label><Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /></div>
        </div>
        {f.image_url && <img src={f.image_url} className="h-24 w-24 rounded-lg object-cover" />}
        <Button onClick={add} className="bg-gradient-primary text-white"><Plus className="mr-2 h-4 w-4" /> Adicionar item</Button>
      </div>
      <div className="space-y-2">
        {items?.map((i) => (
          <div key={i.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3">
            {i.image_url && <img src={i.image_url} className="h-12 w-12 rounded object-cover" />}
            <div className="flex-1"><p className="font-semibold">{i.name}</p><p className="text-xs text-muted-foreground">R$ {Number(i.price).toFixed(2)}</p></div>
            <Button size="icon" variant="ghost" onClick={() => remove(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
