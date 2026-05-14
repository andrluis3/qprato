## Objetivo

Na home (`src/routes/index.tsx`), substituir a palavra fixa "cidade" no título "Descubra os melhores sabores da cidade" pelo nome da cidade onde o usuário está localizado.

## Comportamento

- Ao carregar a home, solicitar a geolocalização do navegador (`navigator.geolocation.getCurrentPosition`).
- Fazer reverse geocoding usando a API do Mapbox (token `VITE_MAPBOX_TOKEN` já configurado) para obter o nome da cidade a partir de lat/lng.
- Exibir dinamicamente: "Descubra os melhores sabores de **{Cidade}**".
- Estados de fallback:
  - Enquanto carrega: mantém "da cidade" (ou um skeleton sutil no nome).
  - Permissão negada / erro / sem suporte: mantém "da cidade" como está hoje.
- Persistir a cidade detectada em `localStorage` (`qprato:city`) para evitar pedir geolocalização a cada visita e mostrar instantaneamente nas próximas.

## Implementação técnica

Arquivo único alterado: `src/routes/index.tsx`.

1. Novo hook local `useUserCity()` dentro do arquivo (ou em `src/hooks/use-user-city.ts` se preferir reutilizar):
   - Lê cache do `localStorage`.
   - Se vazio, chama `navigator.geolocation.getCurrentPosition`.
   - Faz `fetch` em `https://api.mapbox.com/geocoding/v5/mapbox.places/{lng},{lat}.json?access_token={VITE_MAPBOX_TOKEN}&types=place&language=pt`.
   - Extrai `features[0].text` (nome da cidade) e salva no cache.
   - Retorna `{ city: string | null, loading: boolean }`.

2. No `HomePage`, no `<h1>`, trocar:
   ```
   ...sabores</span> da cidade
   ```
   por:
   ```
   ...sabores</span> de {city ?? "sua cidade"}
   ```
   (mantendo o gradiente apenas em "sabores", como hoje).

## Fora de escopo

- Não alterar a busca/filtros por cidade (continua igual).
- Não pedir cidade manualmente via UI nesta etapa — apenas geolocalização automática com fallback.
