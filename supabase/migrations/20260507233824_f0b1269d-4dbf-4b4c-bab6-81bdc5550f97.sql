
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'restaurant', 'user');
CREATE TYPE public.restaurant_status AS ENUM ('pending', 'active', 'disabled');
CREATE TYPE public.featured_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.invoice_status AS ENUM ('paid', 'pending', 'overdue');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Restaurants
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category_id UUID REFERENCES public.categories(id),
  city TEXT,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  phone TEXT,
  hours TEXT,
  cover_url TEXT,
  logo_url TEXT,
  status restaurant_status NOT NULL DEFAULT 'pending',
  delinquent BOOLEAN NOT NULL DEFAULT false,
  featured_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.restaurants(status);
CREATE INDEX ON public.restaurants(category_id);

-- Menu items
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  category TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Promotions
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  discount TEXT,
  valid_until TIMESTAMPTZ,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Favorites
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, restaurant_id)
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, restaurant_id)
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Featured orders (mock payment)
CREATE TABLE public.featured_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  days INTEGER NOT NULL,
  status featured_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ
);
ALTER TABLE public.featured_orders ENABLE ROW LEVEL SECURITY;

-- Invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status invoice_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Profile autocreate trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_restaurants_updated BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- user_roles
CREATE POLICY "roles_select_self_or_admin" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_admin_manage" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- categories: public read, admin write
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_admin_write" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- restaurants
CREATE POLICY "restaurants_public_active" ON public.restaurants FOR SELECT USING (status = 'active' OR auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "restaurants_owner_insert" ON public.restaurants FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "restaurants_owner_update" ON public.restaurants FOR UPDATE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "restaurants_admin_delete" ON public.restaurants FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- menu_items
CREATE POLICY "menu_public_read" ON public.menu_items FOR SELECT USING (
  active OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND (r.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "menu_owner_write" ON public.menu_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid())
);

-- promotions
CREATE POLICY "promo_public_read" ON public.promotions FOR SELECT USING (
  active OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND (r.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "promo_owner_write" ON public.promotions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid())
);

-- favorites
CREATE POLICY "favorites_owner_all" ON public.favorites FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- reviews
CREATE POLICY "reviews_public_read" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_owner_write" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_owner_update" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reviews_owner_delete" ON public.reviews FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- featured_orders
CREATE POLICY "featured_owner_read" ON public.featured_orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "featured_owner_create" ON public.featured_orders FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid())
);
CREATE POLICY "featured_admin_update" ON public.featured_orders FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- invoices
CREATE POLICY "invoices_owner_read" ON public.invoices FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "invoices_admin_write" ON public.invoices FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('restaurant-images', 'restaurant-images', true),
  ('menu-images', 'menu-images', true),
  ('promo-images', 'promo-images', true);

CREATE POLICY "images_public_read" ON storage.objects FOR SELECT USING (bucket_id IN ('restaurant-images','menu-images','promo-images'));
CREATE POLICY "images_auth_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('restaurant-images','menu-images','promo-images'));
CREATE POLICY "images_auth_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id IN ('restaurant-images','menu-images','promo-images') AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "images_auth_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('restaurant-images','menu-images','promo-images') AND auth.uid()::text = (storage.foldername(name))[1]);

-- Seed categories
INSERT INTO public.categories (name, slug, icon) VALUES
  ('Pizza', 'pizza', 'pizza'),
  ('Hambúrguer', 'hamburger', 'beef'),
  ('Japonês', 'japones', 'fish'),
  ('Brasileira', 'brasileira', 'utensils'),
  ('Italiana', 'italiana', 'wheat'),
  ('Mexicana', 'mexicana', 'flame'),
  ('Doces', 'doces', 'cake'),
  ('Bebidas', 'bebidas', 'wine');
