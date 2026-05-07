import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Shield, Store, Sparkles, Receipt, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

const links = [
  { to: "/admin", label: "Dashboard", icon: Shield, exact: true },
  { to: "/admin/restaurantes", label: "Restaurantes", icon: Store },
  { to: "/admin/destaques", label: "Destaques", icon: Sparkles },
  { to: "/admin/financeiro", label: "Financeiro", icon: Receipt },
  { to: "/admin/usuarios", label: "Usuários", icon: Users },
];

function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isAdmin) navigate({ to: "/" });
  }, [user, isAdmin, loading, navigate]);

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
        <main className="flex-1 min-w-0">
          {path === "/admin" ? <AdminHome /> : <Outlet />}
        </main>
      </div>
    </div>
  );
}

function AdminHome() {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Painel administrativo</h1>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        {links.slice(1).map((l) => (
          <Link key={l.to} to={l.to} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 hover:border-primary/50">
            <l.icon className="h-5 w-5 text-primary" /><span className="font-medium">{l.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
