import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Store, UtensilsCrossed, Tag, Sparkles, Receipt, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/painel")({
  component: PanelLayout,
});

const links = [
  { to: "/painel", label: "Visão geral", icon: Store, exact: true },
  { to: "/painel/perfil", label: "Perfil", icon: User },
  { to: "/painel/cardapio", label: "Cardápio", icon: UtensilsCrossed },
  { to: "/painel/promocoes", label: "Promoções", icon: Tag },
  { to: "/painel/destaque", label: "Destaque", icon: Sparkles },
  { to: "/painel/financeiro", label: "Financeiro", icon: Receipt },
];

function PanelLayout() {
  const { user, loading, isRestaurant } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isRestaurant) navigate({ to: "/cadastrar-restaurante" });
  }, [user, isRestaurant, loading, navigate]);

  const { data: restaurant } = useQuery({
    queryKey: ["my-restaurant", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("restaurants").select("*").eq("owner_id", user!.id).maybeSingle()).data,
  });

  if (path === "/painel") return <PanelHome restaurant={restaurant} />;
  return (
    <PanelShell>
      <Outlet />
    </PanelShell>
  );
}

export function PanelShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="space-y-1">
            {links.map((l) => {
              const active = l.exact ? path === l.to : path.startsWith(l.to);
              return (
                <Link key={l.to} to={l.to} className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                  <l.icon className="h-4 w-4" /> {l.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

function PanelHome({ restaurant }: { restaurant: any }) {
  return (
    <PanelShell>
      <h1 className="font-display text-3xl font-bold">Painel do restaurante</h1>
      {restaurant ? (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="mt-1 text-lg font-bold capitalize">{restaurant.status}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <p className="text-xs text-muted-foreground">Destaque</p>
            <p className="mt-1 text-lg font-bold">
              {restaurant.featured_until && new Date(restaurant.featured_until) > new Date()
                ? `Até ${new Date(restaurant.featured_until).toLocaleDateString("pt-BR")}` : "Inativo"}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <p className="text-xs text-muted-foreground">Inadimplência</p>
            <p className={`mt-1 text-lg font-bold ${restaurant.delinquent ? "text-destructive" : "text-success"}`}>
              {restaurant.delinquent ? "Pendente" : "Em dia"}
            </p>
          </div>
        </div>
      ) : <p className="mt-4 text-muted-foreground">Carregando...</p>}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        {links.slice(1).map((l) => (
          <Link key={l.to} to={l.to} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 hover:border-primary/50">
            <l.icon className="h-5 w-5 text-primary" />
            <span className="font-medium">{l.label}</span>
          </Link>
        ))}
      </div>
    </PanelShell>
  );
}
