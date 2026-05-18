import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { MapPin, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { importRestaurantsFromGoogle } from "@/lib/admin-import.functions";

export const Route = createFileRoute("/admin/importar")({ component: AdminImport });

function AdminImport() {
  const importFn = useServerFn(importRestaurantsFromGoogle);
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    total: number;
    created: number;
    updated: number;
    errors: string[];
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await importFn({ data: { city: city.trim() } });
      setResult(res);
      toast.success(
        `${res.created} criados, ${res.updated} atualizados (${res.total} encontrados)`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao importar";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Importar do Google Maps</h1>
        <p className="text-sm text-muted-foreground">
          Busca todos os restaurantes de uma cidade no Google Maps e grava na base como
          pendentes para aprovação.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card p-4">
        <MapPin className="h-5 w-5 text-primary shrink-0" />
        <Input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Ex.: Curitiba, PR"
          className="flex-1 min-w-[200px]"
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !city.trim()} className="bg-gradient-primary text-white">
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importando...</>
          ) : (
            <><Download className="mr-2 h-4 w-4" /> Buscar e importar</>
          )}
        </Button>
      </form>

      {loading && (
        <p className="text-sm text-muted-foreground">
          Buscando restaurantes no Google Maps. Isso pode levar alguns segundos...
        </p>
      )}

      {result && (
        <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
          <h2 className="font-display text-lg font-semibold">Resultado</h2>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Encontrados" value={result.total} />
            <Stat label="Criados" value={result.created} />
            <Stat label="Atualizados" value={result.updated} />
          </div>
          {result.errors.length > 0 && (
            <div>
              <p className="mt-2 text-sm font-medium text-destructive">
                {result.errors.length} erro(s):
              </p>
              <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                {result.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Os novos restaurantes ficam com status <strong>pendente</strong>. Aprove-os em{" "}
            <strong>Restaurantes</strong>.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-bold">{value}</p>
    </div>
  );
}
