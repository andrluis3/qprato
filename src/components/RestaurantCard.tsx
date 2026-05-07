import { Link } from "@tanstack/react-router";
import { Heart, MapPin, Star, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface RestaurantCardData {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  description: string | null;
  cover_url: string | null;
  category?: { name: string } | null;
  rating?: number | null;
  reviewCount?: number;
  featured?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function RestaurantCard({ r }: { r: RestaurantCardData }) {
  return (
    <Link to="/restaurante/$slug" params={{ slug: r.slug }} className="group block">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card transition hover:border-primary/40 hover:shadow-elegant">
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {r.cover_url ? (
            <img src={r.cover_url} alt={r.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-secondary text-muted-foreground">
              Sem imagem
            </div>
          )}
          {r.featured && (
            <Badge className="absolute left-3 top-3 gap-1 bg-accent text-accent-foreground">
              <Sparkles className="h-3 w-3" /> Destaque
            </Badge>
          )}
          {r.onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); r.onToggleFavorite?.(); }}
              className="absolute right-3 top-3 rounded-full bg-background/80 p-2 backdrop-blur transition hover:bg-background"
              aria-label="Favoritar"
            >
              <Heart className={`h-4 w-4 ${r.isFavorite ? "fill-primary text-primary" : "text-foreground"}`} />
            </button>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-semibold leading-tight">{r.name}</h3>
            {typeof r.rating === "number" && (
              <div className="flex shrink-0 items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
                <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                <span className="font-semibold">{r.rating.toFixed(1)}</span>
                {r.reviewCount ? <span className="text-muted-foreground">({r.reviewCount})</span> : null}
              </div>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            {r.category?.name && <span className="rounded-full bg-muted px-2 py-1">{r.category.name}</span>}
            {r.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {r.city}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
