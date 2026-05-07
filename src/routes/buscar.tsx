import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Search, Map as MapIcon, List } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { RestaurantCard } from "@/components/RestaurantCard";
import { MapView } from "@/components/MapView";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchParams { q?: string; category?: string; city?: string; }

export const Route = createFileRoute("/buscar")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    q: (s.q as string) ?? "",
    category: (s.category as string) ?? "",
    city: (s.city as string) ?? "",
  }),
  head: () => ({ meta: [{ title: "Buscar restaurantes — QPrato" }] }),
  component: SearchPage,
});

function SearchPage() {
  const params = Route.useSearch();
  const navigate = useNavigate();
  const [q, setQ] = useState(params.q ?? "");
  const [city, setCity] = useState(params.city ?? "");
  const [view, setView] = useState<"list" | "map">("list");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
  });

  const { data: restaurants } = useQuery({
    queryKey: ["restaurants-search", params],
    queryFn: async () => {
      let qb = supabase
        .from("restaurants")
        .select("id, slug, name, city, description, cover_url, lat, lng, category:categories!inner(id, name, slug)")
        .eq("status", "active");
      if (params.q) qb = qb.ilike("name", `%${params.q}%`);
      if (params.city) qb = qb.ilike("city", `%${params.city}%`);
      if (params.category) qb = qb.eq("categories.slug", params.category);
      const { data } = await qb.limit(60);
      return data ?? [];
    },
  });

  const update = (next: Partial<SearchParams>) => navigate({ to: "/buscar", search: { ...params, ...next } as any });

  const pins = useMemo(() => (restaurants ?? []).filter((r) => r.lat && r.lng).map((r) => ({
    id: r.id, lng: r.lng as number, lat: r.lat as number, name: r.name,
  })), [restaurants]);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="border-b border-border/60 bg-card/30">
        <div className="mx-auto max-w-7xl space-y-3 px-4 py-4">
          <form onSubmit={(e) => { e.preventDefault(); update({ q, city }); }} className="flex flex-wrap gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar restaurante" className="pl-9" />
            </div>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Cidade" className="w-40" />
            <Button type="submit" className="bg-gradient-primary text-white">Buscar</Button>
            <div className="ml-auto flex rounded-md border border-border bg-background p-0.5">
              <Button type="button" size="sm" variant={view === "list" ? "secondary" : "ghost"} onClick={() => setView("list")}><List className="h-4 w-4" /></Button>
              <Button type="button" size="sm" variant={view === "map" ? "secondary" : "ghost"} onClick={() => setView("map")}><MapIcon className="h-4 w-4" /></Button>
            </div>
          </form>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => update({ category: "" })}
              className={`rounded-full px-3 py-1 text-xs ${!params.category ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Todas</button>
            {categories?.map((c) => (
              <button key={c.id} onClick={() => update({ category: c.slug })}
                className={`rounded-full px-3 py-1 text-xs ${params.category === c.slug ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {view === "list" ? (
          <>
            <p className="mb-4 text-sm text-muted-foreground">{restaurants?.length ?? 0} resultado(s)</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {restaurants?.map((r) => <RestaurantCard key={r.id} r={r} />)}
            </div>
          </>
        ) : (
          <div className="h-[70vh] overflow-hidden rounded-2xl border border-border">
            <MapView pins={pins} onPinClick={(id) => {
              const r = restaurants?.find((x) => x.id === id);
              if (r) navigate({ to: "/restaurante/$slug", params: { slug: r.slug } });
            }} />
          </div>
        )}
      </div>
    </div>
  );
}
