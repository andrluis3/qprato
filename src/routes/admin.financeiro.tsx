import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/financeiro")({ component: AdminFin });

function AdminFin() {
  const qc = useQueryClient();
  const { data: restaurants } = useQuery({ queryKey: ["all-r"], queryFn: async () => (await supabase.from("restaurants").select("id, name")).data ?? [] });
  const { data: invoices } = useQuery({
    queryKey: ["all-invoices"],
    queryFn: async () => (await supabase.from("invoices").select("*, restaurant:restaurants(name)").order("due_date", { ascending: false })).data ?? [],
  });
  const [f, setF] = useState({ restaurant_id: "", amount: "", due_date: "" });

  const create = async () => {
    if (!f.restaurant_id || !f.amount || !f.due_date) return;
    const { error } = await supabase.from("invoices").insert({ restaurant_id: f.restaurant_id, amount: Number(f.amount), due_date: f.due_date });
    if (error) return toast.error(error.message);
    setF({ restaurant_id: "", amount: "", due_date: "" });
    qc.invalidateQueries({ queryKey: ["all-invoices"] });
  };
  const setStatus = async (id: string, status: string) => {
    await supabase.from("invoices").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["all-invoices"] });
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Financeiro</h1>
      <div className="grid gap-3 rounded-2xl border border-border/60 bg-card p-4 md:grid-cols-4">
        <Select value={f.restaurant_id} onValueChange={(v) => setF({ ...f, restaurant_id: v })}>
          <SelectTrigger><SelectValue placeholder="Restaurante" /></SelectTrigger>
          <SelectContent>{restaurants?.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="number" step="0.01" placeholder="Valor" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        <Input type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} />
        <Button onClick={create} className="bg-gradient-primary text-white">Gerar fatura</Button>
      </div>
      <div className="space-y-2">
        {invoices?.map((i: any) => (
          <div key={i.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3 text-sm">
            <div className="flex-1"><p className="font-semibold">{i.restaurant?.name}</p><p className="text-xs text-muted-foreground">R$ {Number(i.amount).toFixed(2)} · vence {new Date(i.due_date).toLocaleDateString("pt-BR")}</p></div>
            <Select value={i.status} onValueChange={(v) => setStatus(i.id, v)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">pending</SelectItem>
                <SelectItem value="paid">paid</SelectItem>
                <SelectItem value="overdue">overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
