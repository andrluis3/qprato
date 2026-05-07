import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Search, Heart, User as UserIcon, LogOut, LayoutDashboard, Shield, Store } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppHeader() {
  const { user, isAdmin, isRestaurant, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-elegant">
            <span className="font-display text-lg font-bold text-white">Q</span>
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            <span className="text-gradient-primary">QPrato</span>
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          <Link to="/" className={`rounded-md px-3 py-2 text-sm transition ${path === "/" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Início</Link>
          <Link to="/buscar" className={`rounded-md px-3 py-2 text-sm transition ${path === "/buscar" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Buscar</Link>
          {user && (
            <Link to="/favoritos" className={`rounded-md px-3 py-2 text-sm transition ${path === "/favoritos" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Favoritos</Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/buscar" })} className="md:hidden">
            <Search className="h-5 w-5" />
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold text-white">
                    {(user.email ?? "?")[0].toUpperCase()}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{user.email}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/favoritos" })}>
                  <Heart className="mr-2 h-4 w-4" /> Favoritos
                </DropdownMenuItem>
                {isRestaurant && (
                  <DropdownMenuItem onClick={() => navigate({ to: "/painel" })}>
                    <Store className="mr-2 h-4 w-4" /> Painel do restaurante
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
                    <Shield className="mr-2 h-4 w-4" /> Painel admin
                  </DropdownMenuItem>
                )}
                {!isRestaurant && !isAdmin && (
                  <DropdownMenuItem onClick={() => navigate({ to: "/cadastrar-restaurante" })}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Cadastrar restaurante
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate({ to: "/login" })}>
                <UserIcon className="mr-2 h-4 w-4" /> Entrar
              </Button>
              <Button onClick={() => navigate({ to: "/cadastro" })} className="bg-gradient-primary text-white shadow-elegant">
                Cadastrar
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
