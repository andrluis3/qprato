import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/cadastrar-restaurante")({
  head: () => ({ meta: [{ title: "Cadastrar restaurante — QPrato" }] }),
  component: RegisterRestaurantPage,
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function RegisterRestaurantPage() {
  const { user, loading, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", description: "", category_id: "", city: "", address: "", phone: "", hours: "",
    lat: "", lng: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const slug = `${slugify(form.name)}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await supabase.from("restaurants").insert({
      owner_id: user.id, name: form.name, slug, description: form.description,
      category_id: form.category_id || null, city: form.city, address: form.address, phone: form.phone, hours: form.hours,
      lat: form.lat ? Number(form.lat) : null, lng: form.lng ? Number(form.lng) : null,
      status: "pending",
    });
    if (error) { setSubmitting(false); return toast.error(error.message); }
    await supabase.from("user_roles").insert({ user_id: user.id, role: "restaurant" }).then(() => {});
    await refreshRoles();
    setSubmitting(false);
    toast.success("Restaurante enviado para aprovação!");
    navigate({ to: "/painel" });
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-2 font-display text-3xl font-bold">Cadastrar restaurante</h1>
        <p className="mb-6 text-muted-foreground">Preencha as informações. Após análise, seu restaurante ficará visível.</p>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border/60 bg-card p-6">
          <div><Label>Nome *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Cidade</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          </div>
          <div><Label>Endereço</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Horário</Label><Input placeholder="Seg-Dom 18h-23h" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Latitude</Label><Input type="number" step="any" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} /></div>
            <div><Label>Longitude</Label><Input type="number" step="any" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} /></div>
          </div>
          <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary text-white">
            {submitting ? "Enviando..." : "Enviar para aprovação"}
          </Button>
        </form>
      </div>
    </div>
  );
}
