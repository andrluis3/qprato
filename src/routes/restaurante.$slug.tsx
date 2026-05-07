import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Heart, MapPin, Phone, Clock, Star, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/restaurante/$slug")({
  component: RestaurantPage,
});

function RestaurantPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: restaurant, isLoading } = useQuery({
    queryKey: ["restaurant", slug],
    queryFn: async () => {
      const { data } = await supabase.from("restaurants").select("*, category:categories(name)").eq("slug", slug).maybeSingle();
      return data;
    },
  });

  const { data: items } = useQuery({
    queryKey: ["menu", restaurant?.id],
    enabled: !!restaurant?.id,
    queryFn: async () => (await supabase.from("menu_items").select("*").eq("restaurant_id", restaurant!.id).eq("active", true)).data ?? [],
  });

  const { data: promos } = useQuery({
    queryKey: ["promos", restaurant?.id],
    enabled: !!restaurant?.id,
    queryFn: async () => (await supabase.from("promotions").select("*").eq("restaurant_id", restaurant!.id).eq("active", true)).data ?? [],
  });

  const { data: reviews } = useQuery({
    queryKey: ["reviews", restaurant?.id],
    enabled: !!restaurant?.id,
    queryFn: async () => (await supabase.from("reviews").select("*").eq("restaurant_id", restaurant!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const { data: fav } = useQuery({
    queryKey: ["fav", restaurant?.id, user?.id],
    enabled: !!restaurant?.id && !!user,
    queryFn: async () => {
      const { data } = await supabase.from("favorites").select("id").eq("restaurant_id", restaurant!.id).eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
  });

  const toggleFav = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Faça login para favoritar");
      if (!restaurant) return;
      if (fav) {
        await supabase.from("favorites").delete().eq("restaurant_id", restaurant.id).eq("user_id", user.id);
      } else {
        await supabase.from("favorites").insert({ restaurant_id: restaurant.id, user_id: user.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fav", restaurant?.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const avg = reviews && reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  if (isLoading) return <div className="flex min-h-screen items-center justify-center">Carregando...</div>;
  if (!restaurant) {
    return (
      <div className="min-h-screen"><AppHeader />
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h1 className="font-display text-3xl font-bold">Restaurante não encontrado</h1>
          <Link to="/" className="mt-4 inline-flex text-primary hover:underline">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  const featured = restaurant.featured_until && new Date(restaurant.featured_until) > new Date();

  return (
    <div className="min-h-screen">
      <AppHeader />

      {/* Cover */}
      <div className="relative h-64 overflow-hidden bg-muted md:h-80">
        {restaurant.cover_url ? (
          <img src={restaurant.cover_url} alt={restaurant.name} className="h-full w-full object-cover" />
        ) : <div className="h-full w-full bg-gradient-to-br from-primary/30 to-accent/20" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <div className="mx-auto -mt-20 max-w-5xl px-4">
        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-elegant">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              {featured && (
                <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">
                  <Sparkles className="h-3 w-3" /> Destaque
                </span>
              )}
              <h1 className="font-display text-3xl font-bold md:text-4xl">{restaurant.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {(restaurant.category as any)?.name && <span className="rounded-full bg-muted px-2 py-0.5">{(restaurant.category as any).name}</span>}
                {restaurant.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {restaurant.city}</span>}
                {avg !== null && <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-accent text-accent" /> {avg.toFixed(1)} ({reviews?.length})</span>}
              </div>
            </div>
            <Button
              onClick={() => user ? toggleFav.mutate() : navigate({ to: "/login" })}
              variant={fav ? "default" : "outline"} className={fav ? "bg-primary" : ""}
            >
              <Heart className={`mr-2 h-4 w-4 ${fav ? "fill-current" : ""}`} />
              {fav ? "Favorito" : "Favoritar"}
            </Button>
          </div>
          {restaurant.description && <p className="mt-4 text-muted-foreground">{restaurant.description}</p>}
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
            {restaurant.address && <div className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {restaurant.address}</div>}
            {restaurant.phone && <div className="inline-flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> {restaurant.phone}</div>}
            {restaurant.hours && <div className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> {restaurant.hours}</div>}
          </div>
        </div>

        {/* Promos */}
        {promos && promos.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 font-display text-xl font-bold">Promoções</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {promos.map((p) => (
                <div key={p.id} className="rounded-xl border border-accent/40 bg-accent/5 p-4">
                  <div className="mb-2 inline-block rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">{p.discount ?? "Promo"}</div>
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Menu */}
        <section className="mt-8">
          <h2 className="mb-3 font-display text-xl font-bold">Cardápio</h2>
          {items && items.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {items.map((it) => (
                <div key={it.id} className="flex gap-4 rounded-xl border border-border/60 bg-card p-4">
                  {it.image_url && <img src={it.image_url} alt={it.name} className="h-20 w-20 shrink-0 rounded-lg object-cover" />}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold">{it.name}</h4>
                      <span className="font-display font-bold text-primary">R$ {Number(it.price).toFixed(2)}</span>
                    </div>
                    {it.description && <p className="mt-1 text-sm text-muted-foreground">{it.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">Cardápio ainda não disponível.</p>}
        </section>

        {/* Reviews */}
        <section className="mt-8 pb-16">
          <h2 className="mb-3 font-display text-xl font-bold">Avaliações</h2>
          {user && <ReviewForm restaurantId={restaurant.id} userId={user.id} onCreated={() => qc.invalidateQueries({ queryKey: ["reviews", restaurant.id] })} />}
          <div className="mt-4 space-y-3">
            {reviews?.map((r) => (
              <div key={r.id} className="rounded-xl border border-border/60 bg-card p-4">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-accent text-accent" : "text-muted"}`} />
                  ))}
                </div>
                {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
            ))}
            {(!reviews || reviews.length === 0) && <p className="text-sm text-muted-foreground">Seja o primeiro a avaliar.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

function ReviewForm({ restaurantId, userId, onCreated }: { restaurantId: string; userId: string; onCreated: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("reviews").upsert({ restaurant_id: restaurantId, user_id: userId, rating, comment }, { onConflict: "user_id,restaurant_id" });
    setLoading(false);
    if (error) return toast.error(error.message);
    setComment(""); toast.success("Avaliação enviada!"); onCreated();
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-border/60 bg-card p-4">
      <div className="mb-2 flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <button type="button" key={i} onClick={() => setRating(i + 1)}>
            <Star className={`h-6 w-6 ${i < rating ? "fill-accent text-accent" : "text-muted-foreground"}`} />
          </button>
        ))}
      </div>
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Conte sua experiência..." />
      <Button type="submit" disabled={loading} className="mt-2 bg-gradient-primary text-white">Enviar avaliação</Button>
    </form>
  );
}
