-- ==========================================================================
-- SCRIPT DE CONFIGURACIÓN SUPABASE POSTGRESQL PARA CYBER-MTV PLATFORM
-- Ejecuta este script en Supabase SQL Editor:
-- Dashboard > SQL Editor > New Query > Paste & Run
-- ==========================================================================

-- 1. TABLA DE ESTACIONES DE RADIO
CREATE TABLE IF NOT EXISTS public.stations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    genre TEXT NOT NULL,
    description TEXT,
    cover TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABLA DE BANDAS INSCRITAS
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

-- 3. TABLA DE CANCIONES Y VIDEOCLIPS
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

-- 4. PERMISOS DE LECTURA Y ESCRITURA PÚBLICA (Row Level Security / RLS)
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública de estaciones" ON public.stations FOR SELECT USING (true);
CREATE POLICY "Escritura pública de estaciones" ON public.stations FOR ALL USING (true);

CREATE POLICY "Lectura pública de bandas" ON public.bands FOR SELECT USING (true);
CREATE POLICY "Escritura pública de bandas" ON public.bands FOR ALL USING (true);

CREATE POLICY "Lectura pública de canciones" ON public.songs FOR SELECT USING (true);
CREATE POLICY "Escritura pública de canciones" ON public.songs FOR ALL USING (true);

-- 5. DATOS SEMILLA INICIALES DE ESTACIONES
INSERT INTO public.stations (id, name, genre, description, cover) VALUES
('rock-indie', 'MTV Rock Independiente', 'Indie Rock / Post-Punk', 'Videoclips en vivo, riffs distorsionados y rock garajero independiente.', 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&q=80'),
('synthwave-cyber', 'Synthwave & Cyberpunk TV', 'Synthwave / Retro Electro', 'Videoclips con estética ochentera, luces de neón y carreras de autos futuristas.', 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&q=80'),
('pop-latino-indie', 'Pop Alternativo & Funk', 'Indie Pop / Funk', 'Videoclips llenos de color, ritmos bañados por el sol y grooves bailables.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80')
ON CONFLICT (id) DO NOTHING;
