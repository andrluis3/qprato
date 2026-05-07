
# QPrato — Guia Gastronômico

Plataforma com 3 ambientes (usuário final, restaurante, admin), backend Lovable Cloud (Supabase), busca com mapa e tema dark inspirado no iFood.

## Stack e decisões

- **Backend:** Lovable Cloud (auth e-mail/senha + Google, banco, storage de imagens, RLS).
- **Mapa:** Mapbox GL JS — pediremos a chave pública (`VITE_MAPBOX_TOKEN`) via secret no momento da implementação.
- **Pagamento de destaque:** mock (botão cria pedido `pending`, admin aprova).
- **Design:** tema dark, vermelho/laranja vibrante como accent (estilo iFood), totalmente responsivo, tokens em `src/styles.css` (oklch).

## Modelo de dados (Supabase)

- `profiles` — id (=auth.users), nome, avatar, telefone.
- `user_roles` — (user_id, role: `admin` | `restaurant` | `user`) + função `has_role`.
- `restaurants` — owner_id, nome, slug, descrição, categoria, cidade, endereço, lat/lng, telefone, horário, capa, logo, status (`pending`|`active`|`disabled`), inadimplente (bool), destaque_até (timestamp).
- `categories` — nome, ícone (pizza, hamburger, japonês, etc.).
- `menu_items` — restaurant_id, nome, descrição, preço, imagem, categoria, ativo.
- `promotions` — restaurant_id, título, descrição, desconto, válido_até, imagem, ativo.
- `favorites` — user_id, restaurant_id.
- `reviews` — user_id, restaurant_id, nota (1-5), comentário.
- `featured_orders` — restaurant_id, plano, valor, dias, status (`pending`|`approved`|`rejected`), criado_em.
- `invoices` — restaurant_id, valor, vencimento, status (`paid`|`pending`|`overdue`).
- **Storage buckets:** `restaurant-images`, `menu-images`, `promo-images` (públicos para leitura).
- **RLS:** leitura pública de restaurantes `active`, escrita restrita ao owner; admin via `has_role`.

## Rotas (TanStack Start)

**Público / usuário:**
- `/` — home com busca, categorias, restaurantes em destaque, promoções.
- `/buscar` — lista + mapa (Mapbox), filtros por categoria/cidade/texto/raio.
- `/restaurante/$slug` — perfil, cardápio, promoções, avaliações, botão favoritar.
- `/favoritos` — protegida.
- `/login`, `/cadastro`.

**Restaurante (`/_restaurant/...`):**
- `/painel` — visão geral (visitas, favoritos, avaliações, status destaque).
- `/painel/perfil` — edição (inclui localização no mapa).
- `/painel/cardapio` — CRUD de produtos com upload.
- `/painel/promocoes` — CRUD de promoções.
- `/painel/destaque` — escolher plano e "comprar" (mock).
- `/painel/financeiro` — faturas e status de inadimplência.

**Admin (`/_admin/...`):**
- `/admin` — dashboard.
- `/admin/restaurantes` — aprovar pendentes, ativar/desativar.
- `/admin/destaques` — aprovar pedidos de destaque.
- `/admin/financeiro` — marcar inadimplência, gerar faturas.
- `/admin/usuarios` — gerenciar papéis.

Guarda de rotas via layouts `_authenticated`, `_restaurant` e `_admin` com `beforeLoad` checando `has_role`.

## Componentes principais

- `AppHeader` (logo QPrato, busca, login/avatar).
- `RestaurantCard`, `CategoryChip`, `PromoCard`, `MenuItemCard`, `ReviewItem`, `RatingStars`.
- `MapView` (Mapbox) com pins clicáveis.
- `ImageUploader` (Supabase Storage).
- Sidebar nos painéis restaurante/admin (shadcn `Sidebar`, colapsável).

## Design system

- Dark padrão, sem toggle (foco mobile-first).
- Tokens em `src/styles.css`:
  - `--background` ~ oklch(0.16 0.01 20)
  - `--primary` vermelho QPrato ~ oklch(0.62 0.22 25), `--primary-glow` laranja
  - `--accent` amarelo quente para badges de destaque/promo
  - gradientes `--gradient-primary`, sombras `--shadow-elegant`
- Tipografia: display "Sora" + body "Inter" (Google Fonts).
- Animações suaves com framer-motion na home.

## Entrega em ordem

1. Habilitar Lovable Cloud, criar tabelas, RLS, buckets, seed de categorias e ~6 restaurantes demo.
2. Design system dark + layout base + auth (e-mail/senha + Google).
3. Área usuário: home, busca com mapa, perfil do restaurante, favoritos, avaliações.
4. Área restaurante: painel, perfil, cardápio, promoções, destaque (mock), financeiro (visualização).
5. Área admin: aprovações, ativar/desativar, destaques, inadimplência, papéis.
6. Polimento responsivo + SEO por rota.

## O que precisarei de você durante a build

- Token público do Mapbox (`VITE_MAPBOX_TOKEN`) — peço via secret quando chegar na etapa do mapa.
- Confirmação para habilitar Lovable Cloud no início.
