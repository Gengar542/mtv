-- ==========================================================================
-- SCRIPT DE CONFIGURACIÓN SUPABASE POSTGRESQL PARA CYBER-MTV PLATFORM
-- (CON TABLA DE USUARIOS Y CONTRASEÑAS CIFRADAS EN SHA-256)
-- ==========================================================================

-- 1. TABLA DE USUARIOS (CON CONTRASEÑAS CIFRADAS HASH)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('oyente', 'banda', 'admin')),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABLA DE ESTACIONES DE RADIO
CREATE TABLE IF NOT EXISTS public.stations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    genre TEXT NOT NULL,
    description TEXT,
    cover TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABLA DE BANDAS INSCRITAS
CREATE TABLE IF NOT EXISTS public.bands (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    genre TEXT NOT NULL,
    station_id TEXT REFERENCES public.stations(id) ON DELETE SET NULL,
    bio TEXT,
    cover TEXT,
    instagram TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABLA DE CANCIONES Y VIDEOCLIPS
CREATE TABLE IF NOT EXISTS public.songs (
    id TEXT PRIMARY KEY,
    band_id TEXT REFERENCES public.bands(id) ON DELETE CASCADE,
    band_name TEXT,
    title TEXT NOT NULL,
    album TEXT,
    station_id TEXT REFERENCES public.stations(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,
    video_url TEXT,
    cover TEXT,
    year INT DEFAULT 2026,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PERMISOS RLS CON INSERCIÓN HABILITADA
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permiso usuarios" ON public.users;
CREATE POLICY "Permiso usuarios" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permiso estaciones" ON public.stations;
CREATE POLICY "Permiso estaciones" ON public.stations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permiso bandas" ON public.bands;
CREATE POLICY "Permiso bandas" ON public.bands FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permiso canciones" ON public.songs;
CREATE POLICY "Permiso canciones" ON public.songs FOR ALL USING (true) WITH CHECK (true);

-- 5. USUARIOS INICIALES PRECARGADOS (CONTRASEÑAS CIFRADAS EN SHA-256)
-- admin@mtv.com / admin -> Hash SHA-256: 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
-- banda@mtv.com / banda123 -> Hash SHA-256: 80509653835697658c27cf9487c95e1e1a5332f1434cfa7ef9ecdd268b812f8e
-- oyente@mtv.com / oyente123 -> Hash SHA-256: c7e2c9ef895690b20be8e02d6b38c2013f41249767fa668ef7321e0ca65463f2
INSERT INTO public.users (id, email, password_hash, role, name) VALUES
('user-admin-1', 'admin@mtv.com', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'admin', 'Director Admin MTV'),
('user-banda-1', 'banda@mtv.com', '80509653835697658c27cf9487c95e1e1a5332f1434cfa7ef9ecdd268b812f8e', 'banda', 'Banda Músico Demo'),
('user-oyente-1', 'oyente@mtv.com', 'c7e2c9ef895690b20be8e02d6b38c2013f41249767fa668ef7321e0ca65463f2', 'oyente', 'Usuario Oyente Demo')
ON CONFLICT (id) DO NOTHING;
