import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, MapPin, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserCity } from "@/hooks/use-user-city";
import heroBg from "@/assets/hero-bg.png";
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
  const { city, status, retry } = useUserCity();

  const rotatingWords = ["pratos", "temperos", "aromas", "petiscos", "sabores", "restaurantes", "bares", "opções"];
  const [wordIndex, setWordIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setWordIndex((i) => (i + 1) % rotatingWords.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);
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
      <section className="relative w-full overflow-hidden min-h-screen">
        <div
          className="absolute inset-0 -z-10 bg-center bg-no-repeat bg-cover blur-[2px] scale-105"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="absolute inset-0 -z-10 bg-background/55" />
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs backdrop-blur">
              <Sparkles className="h-3 w-3 text-accent" /> Guia gastronômico
            </div>
            <motion.form
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              onSubmit={(e) => { e.preventDefault(); navigate({ to: "/buscar", search: { q } as any }); }}
              className="mb-8 flex w-full max-w-3xl items-center gap-2 rounded-2xl border-2 border-primary/30 bg-card/95 p-3 shadow-elegant ring-4 ring-primary/10 backdrop-blur md:gap-3 md:p-4"
            >
              <Search className="ml-2 h-6 w-6 shrink-0 text-primary md:h-7 md:w-7" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pizza, hambúrguer, restaurante japonês..."
                className="h-12 border-0 bg-transparent text-base shadow-none focus-visible:ring-0 md:h-14 md:text-lg"
              />
              <Button type="submit" size="lg" className="h-12 shrink-0 bg-gradient-primary px-6 text-white shadow-elegant md:h-14 md:px-8 md:text-base">
                <Search className="h-4 w-4 md:hidden" />
                <span className="hidden md:inline">Buscar</span>
              </Button>
            </motion.form>
            <h1 className="font-display text-5xl font-bold leading-tight md:text-7xl">
              Descubra os melhores{" "}
              <span className="relative inline-block align-baseline">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={rotatingWords[wordIndex]}
                    initial={{ opacity: 0, filter: "blur(12px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, filter: "blur(12px)" }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="text-gradient-primary inline-block"
                  >
                    {rotatingWords[wordIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>{" "}
              de{" "}
              <span className="relative inline-block align-baseline">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={city ?? "fallback"}
                    initial={{ opacity: 0, filter: "blur(12px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, filter: "blur(12px)" }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="inline-block"
                  >
                    {city ?? "sua cidade"}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>
            {status === "error" && !city && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <span>Não conseguimos detectar sua cidade.</span>
                <Button type="button" size="sm" variant="outline" onClick={retry}>
                  <MapPin className="h-3.5 w-3.5" /> Tentar novamente
                </Button>
              </div>
            )}
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Cardápios, promoções e avaliações de restaurantes selecionados — tudo em um só lugar.
            </p>
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
