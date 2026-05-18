import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

const InputSchema = z.object({
  city: z.string().trim().min(2).max(120),
});

type PlaceLite = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  location?: { latitude?: number; longitude?: number };
};

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const importRestaurantsFromGoogle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verifica admin
    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Acesso negado: somente administradores.");

    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada.");
    if (!GOOGLE_MAPS_API_KEY)
      throw new Error(
        "Google Maps Platform não está conectado. Conecte em Conectores → Google Maps Platform."
      );

    const fieldMask = [
      "places.id",
      "places.displayName",
      "places.formattedAddress",
      "places.nationalPhoneNumber",
      "places.websiteUri",
      "places.location",
      "nextPageToken",
    ].join(",");

    const allPlaces: PlaceLite[] = [];
    let pageToken: string | undefined;
    let safety = 0;

    do {
      safety++;
      const body: Record<string, unknown> = {
        textQuery: `restaurantes em ${data.city}`,
        includedType: "restaurant",
        pageSize: 20,
      };
      if (pageToken) body.pageToken = pageToken;

      const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
          "Content-Type": "application/json",
          "X-Goog-FieldMask": fieldMask,
        },
        body: JSON.stringify(body),
      });

      const json = (await res.json()) as {
        places?: PlaceLite[];
        nextPageToken?: string;
        error?: { message?: string };
      };

      if (!res.ok) {
        throw new Error(
          `Google Places falhou [${res.status}]: ${json?.error?.message ?? JSON.stringify(json)}`
        );
      }

      if (Array.isArray(json.places)) allPlaces.push(...json.places);
      pageToken = json.nextPageToken;

      // Places API: precisa de pequeno delay entre paginações
      if (pageToken) await new Promise((r) => setTimeout(r, 2000));
    } while (pageToken && safety < 5);

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const p of allPlaces) {
      const name = p.displayName?.text?.trim();
      if (!name || !p.id) continue;

      const slug = `${slugify(name)}-${p.id.slice(-6).toLowerCase()}`;
      const payload = {
        google_place_id: p.id,
        name,
        slug,
        owner_id: userId,
        status: "pending" as const,
        city: data.city,
        address: p.formattedAddress ?? null,
        phone: p.nationalPhoneNumber ?? null,
        lat: p.location?.latitude ?? null,
        lng: p.location?.longitude ?? null,
      };

      // Verifica existência prévia para contar created vs updated
      const { data: existing } = await supabase
        .from("restaurants")
        .select("id")
        .eq("google_place_id", p.id)
        .maybeSingle();

      const { error } = await supabase
        .from("restaurants")
        .upsert(payload, { onConflict: "google_place_id" });

      if (error) {
        errors.push(`${name}: ${error.message}`);
        continue;
      }
      if (existing) updated++;
      else created++;
    }

    return {
      total: allPlaces.length,
      created,
      updated,
      errors,
    };
  });
