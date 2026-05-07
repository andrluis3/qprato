import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { RestaurantCard } from "@/components/RestaurantCard";

export const Route = createFileRoute("/favoritos")({
  head: () => ({ meta: [{ title: "Meus favoritos — QPrato" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  const { data } = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("restaurant:restaurants(id, slug, name, city, description, cover_url, status, category:categories(name))")
        .eq("user_id", user!.id);
      return (data ?? []).map((f) => f.restaurant).filter((r): r is NonNullable<typeof r> => !!r && (r as any).status === "active");
    },
  });

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-6 font-display text-3xl font-bold">Meus favoritos</h1>
        {data && data.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((r: any) => <RestaurantCard key={r.id} r={r} />)}
          </div>
        ) : (
          <p className="text-muted-foreground">Você ainda não favoritou nenhum restaurante. <Link to="/buscar" className="text-primary hover:underline">Explorar</Link></p>
        )}
      </div>
    </div>
  );
}
