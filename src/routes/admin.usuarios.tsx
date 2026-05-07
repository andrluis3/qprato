import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/usuarios")({ component: AdminUsers });

function AdminUsers() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const [{ data: roles }, { data: profiles }] = await Promise.all([
        supabase.from("user_roles").select("*"),
        supabase.from("profiles").select("id, full_name"),
      ]);
      const map = new Map<string, { id: string; full_name: string | null; roles: string[] }>();
      profiles?.forEach((p) => map.set(p.id, { id: p.id, full_name: p.full_name, roles: [] }));
      roles?.forEach((r) => {
        const u = map.get(r.user_id) ?? { id: r.user_id, full_name: null, roles: [] };
        u.roles.push(r.role); map.set(r.user_id, u);
      });
      return Array.from(map.values());
    },
  });

  const toggle = async (uid: string, role: "admin" | "restaurant", has: boolean) => {
    if (has) await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role);
    else await supabase.from("user_roles").insert({ user_id: uid, role });
    toast.success("Atualizado");
    qc.invalidateQueries({ queryKey: ["all-roles"] });
  };

  return (
    <div className="space-y-3">
      <h1 className="font-display text-2xl font-bold">Usuários</h1>
      {data?.map((u) => (
        <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{u.full_name ?? "(sem nome)"}</p>
            <p className="text-xs text-muted-foreground">{u.id}</p>
            <p className="mt-1 text-xs">{u.roles.join(", ") || "user"}</p>
          </div>
          <Button size="sm" variant={u.roles.includes("restaurant") ? "default" : "outline"} onClick={() => toggle(u.id, "restaurant", u.roles.includes("restaurant"))}>
            {u.roles.includes("restaurant") ? "Remover restaurante" : "Tornar restaurante"}
          </Button>
          <Button size="sm" variant={u.roles.includes("admin") ? "default" : "outline"} onClick={() => toggle(u.id, "admin", u.roles.includes("admin"))}>
            {u.roles.includes("admin") ? "Remover admin" : "Tornar admin"}
          </Button>
        </div>
      ))}
    </div>
  );
}
