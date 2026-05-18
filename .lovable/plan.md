# Importar restaurantes do Google Maps (Admin)

## Objetivo
Adicionar no painel admin uma tela que, a partir de uma cidade informada, busca todos os restaurantes daquela cidade no Google Maps e grava/atualiza diretamente na tabela `restaurants` do banco.

## Fluxo do usuário
1. Admin acessa **Admin → Importar do Google Maps**.
2. Digita o nome da cidade (ex.: "Curitiba, PR") e clica em **Buscar restaurantes**.
3. A plataforma busca via Google Places (New) e mostra prévia: nome, endereço, telefone, total encontrado.
4. Admin clica **Importar todos** (ou seleciona itens) → registros são gravados como `status = pending` para aprovação posterior na tela já existente de "Restaurantes".
5. Toast com resumo: X criados, Y atualizados, Z ignorados.

## Decisões confirmadas
- **owner_id**: id do próprio admin que dispara a importação.
- **Duplicados**: identificados pelo `google_place_id`; se já existir, **atualiza** (nome, endereço, telefone, lat/lng, cidade).
- **Schema**: adicionar coluna `google_place_id text UNIQUE` em `restaurants`.
- **Status inicial**: `pending` (admin aprova depois no fluxo já existente).

## Mudanças técnicas

### 1. Banco (migração)
- `ALTER TABLE restaurants ADD COLUMN google_place_id text UNIQUE`.
- Índice já vem com UNIQUE.
- Sem mudança de RLS (admin já tem acesso via políticas existentes).

### 2. Conector Google Maps
- Usar conector **Google Maps Platform** (gateway Lovable) já documentado no projeto.
- Endpoint: `places/v1/places:searchText` (Places API New) com paginação via `pageToken` até esgotar.
- Campos solicitados (FieldMask): `places.id, places.displayName, places.formattedAddress, places.location, places.nationalPhoneNumber, places.websiteUri, places.types, nextPageToken`.
- Query: `restaurantes em <cidade>` + filtro `includedType: "restaurant"`.

### 3. Server function (TanStack)
Arquivo: `src/lib/admin-import.functions.ts`
- `importRestaurantsFromGoogle` — `createServerFn({ method: "POST" })` com `requireSupabaseAuth`.
- Valida com Zod: `{ city: string (min 2) }`.
- Verifica se o usuário é admin via `has_role` (RPC) — bloqueia se não for.
- Faz loop de paginação no gateway Google Maps (máx ~60 resultados por busca, limite do Places).
- Para cada lugar:
  - Faz `upsert` em `restaurants` usando `onConflict: "google_place_id"`.
  - Gera `slug` a partir do nome + sufixo curto do place_id para garantir unicidade.
  - Define `owner_id = userId do admin`, `status = 'pending'`, `city`, `address`, `lat/lng`, `phone`.
- Retorna `{ created, updated, total, errors }`.

### 4. UI (rota)
Arquivo: `src/routes/admin.importar.tsx`
- Input de cidade + botão "Buscar e importar".
- Loading state, resultado em lista, resumo final.
- Link para a tela já existente `admin/restaurantes` para aprovar os pendentes.
- Adicionar entrada no menu/nav do admin existente.

## Detalhes técnicos
- Chamada ao gateway: `https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchText` com headers `Authorization: Bearer $LOVABLE_API_KEY` e `X-Connection-Api-Key: $GOOGLE_MAPS_API_KEY` (lidos via `process.env` dentro do `.handler()`).
- Pré-requisito: usuário precisa conectar **Google Maps Platform** em Conectores antes de usar a funcionalidade. Se a chave não estiver presente, a server fn retorna mensagem clara orientando a conexão.
- Slug: `slugify(name) + '-' + placeId.slice(-6)` para evitar colisões.
- `category_id` fica null nesta importação (admin pode classificar depois).

## Fora de escopo
- Importação automática agendada (cron).
- Importação de cardápio/fotos do Google.
- Geocoding manual — usamos lat/lng já retornados pelo Places.
