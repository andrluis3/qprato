import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Sparkles, MapPin, ArrowRight } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { RestaurantCard } from "@/components/RestaurantCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QPrato — Descubra os melhores restaurantes" },
      { name: "description", content: "Guia gastronômico com restaurantes, cardápios e promoções perto de você." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
  });

  const { data: featured } = useQuery({
    queryKey: ["featured"],
    queryFn: async () =>
      (await supabase
        .from("restaurants")
        .select("id, slug, name, city, description, cover_url, featured_until, category:categories(name)")
        .eq("status", "active")
        .gte("featured_until", new Date().toISOString())
        .limit(6)).data ?? [],
  });

  const { data: latest } = useQuery({
    queryKey: ["latest"],
    queryFn: async () =>
      (await supabase
        .from("restaurants")
        .select("id, slug, name, city, description, cover_url, category:categories(name)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8)).data ?? [],
  });

  const { data: promos } = useQuery({
    queryKey: ["promos-home"],
    queryFn: async () =>
      (await supabase
        .from("promotions")
        .select("id, title, description, discount, image_url, restaurant:restaurants(name, slug, status)")
        .eq("active", true)
        .limit(4)).data ?? [],
  });

  return (
    <div className="min-h-screen">
      <AppHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs backdrop-blur">
              <Sparkles className="h-3 w-3 text-accent" /> Guia gastronômico
            </div>
            <h1 className="font-display text-5xl font-bold leading-tight md:text-7xl">
              Descubra os melhores <span className="text-gradient-primary">sabores</span> da cidade
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Cardápios, promoções e avaliações de restaurantes selecionados — tudo em um só lugar.
            </p>
            <form
              onSubmit={(e) => { e.preventDefault(); navigate({ to: "/buscar", search: { q } as any }); }}
              className="mt-8 flex max-w-2xl items-center gap-2 rounded-2xl border border-border/60 bg-card/80 p-2 shadow-elegant backdrop-blur"
            >
              <Search className="ml-3 h-5 w-5 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pizza, hambúrguer, restaurante japonês..."
                className="border-0 bg-transparent text-base focus-visible:ring-0" />
              <Button type="submit" className="bg-gradient-primary text-white">Buscar</Button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <h2 className="mb-4 font-display text-2xl font-bold">Categorias</h2>
        <div className="flex gap-3 overflow-x-auto pb-3">
          {categories?.map((c) => (
            <Link key={c.id} to="/buscar" search={{ category: c.slug } as any}
              className="group flex shrink-0 items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2.5 text-sm hover:border-primary/50 hover:bg-primary/10">
              <span className="font-medium">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      {featured && featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
              <Sparkles className="h-5 w-5 text-accent" /> Em destaque
            </h2>
            <Link to="/buscar" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">Ver todos <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((r) => <RestaurantCard key={r.id} r={{ ...r, featured: true }} />)}
          </div>
        </section>
      )}

      {/* PROMOS */}
      {promos && promos.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8">
          <h2 className="mb-4 font-display text-2xl font-bold">Promoções imperdíveis</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {promos.map((p) => (
              <Link key={p.id} to="/restaurante/$slug" params={{ slug: (p.restaurant as any)?.slug ?? "" }}
                className="group overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card transition hover:border-accent/50">
                <div className="aspect-[16/10] bg-gradient-to-br from-accent/20 to-primary/10">
                  {p.image_url && <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />}
                </div>
                <div className="p-4">
                  <div className="mb-1 inline-block rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">{p.discount ?? "Promo"}</div>
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{(p.restaurant as any)?.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* LATEST */}
      <section className="mx-auto max-w-7xl px-4 py-8 pb-20">
        <h2 className="mb-4 font-display text-2xl font-bold">Novos restaurantes</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {latest?.map((r) => <RestaurantCard key={r.id} r={r} />)}
        </div>
        {(!latest || latest.length === 0) && (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            <MapPin className="mx-auto mb-2 h-8 w-8 opacity-50" />
            Ainda não há restaurantes cadastrados. Seja o primeiro!
            <div className="mt-4">
              <Link to="/cadastrar-restaurante" className="inline-flex rounded-md bg-gradient-primary px-4 py-2 text-sm font-medium text-white">
                Cadastrar restaurante
              </Link>
            </div>
          </div>
        )}
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        <p><span className="font-display text-gradient-primary font-bold">QPrato</span> © {new Date().getFullYear()} — Guia gastronômico</p>
      </footer>
    </div>
  );
}
