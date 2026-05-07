import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/painel/perfil")({ component: ProfilePanel });

function ProfilePanel() {
  const { user } = useAuth();
  const { data: r, refetch } = useQuery({
    queryKey: ["my-restaurant-edit", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("restaurants").select("*").eq("owner_id", user!.id).maybeSingle()).data,
  });
  const [f, setF] = useState<any>({});
  useEffect(() => { if (r) setF(r); }, [r]);

  const save = async () => {
    const { error } = await supabase.from("restaurants").update({
      name: f.name, description: f.description, city: f.city, address: f.address,
      phone: f.phone, hours: f.hours, lat: f.lat, lng: f.lng, cover_url: f.cover_url, logo_url: f.logo_url,
    }).eq("id", r!.id);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado"); refetch();
  };

  const upload = async (file: File, field: "cover_url" | "logo_url") => {
    if (!user) return;
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("restaurant-images").upload(path, file);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("restaurant-images").getPublicUrl(path);
    setF({ ...f, [field]: data.publicUrl });
  };

  if (!r) return <p>Carregando...</p>;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Perfil do restaurante</h1>
      <div className="grid gap-4 rounded-2xl border border-border/60 bg-card p-6">
        <div><Label>Capa</Label>
          {f.cover_url && <img src={f.cover_url} className="mb-2 h-32 w-full rounded-lg object-cover" />}
          <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "cover_url")} />
        </div>
        <div><Label>Nome</Label><Input value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><Label>Descrição</Label><Textarea value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Cidade</Label><Input value={f.city ?? ""} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
          <div><Label>Telefone</Label><Input value={f.phone ?? ""} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        </div>
        <div><Label>Endereço</Label><Input value={f.address ?? ""} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
        <div><Label>Horário</Label><Input value={f.hours ?? ""} onChange={(e) => setF({ ...f, hours: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Latitude</Label><Input type="number" step="any" value={f.lat ?? ""} onChange={(e) => setF({ ...f, lat: e.target.value ? Number(e.target.value) : null })} /></div>
          <div><Label>Longitude</Label><Input type="number" step="any" value={f.lng ?? ""} onChange={(e) => setF({ ...f, lng: e.target.value ? Number(e.target.value) : null })} /></div>
        </div>
        <Button onClick={save} className="bg-gradient-primary text-white">Salvar</Button>
      </div>
    </div>
  );
}
