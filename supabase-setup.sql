-- ==========================================================================
-- SCRIPT DE ACTUALIZACIÓN RLS Y DATOS INICIALES PARA SUPABASE
-- Ejecuta este script en tu Supabase SQL Editor:
-- Dashboard > SQL Editor > New Query > Paste & Run
-- ==========================================================================

-- 1. ASEGURAR PERMISOS RLS DE INSERT Y UPDATE EN SUPABASE
DROP POLICY IF EXISTS "Escritura pública de estaciones" ON public.stations;
DROP POLICY IF EXISTS "Escritura pública de bandas" ON public.bands;
DROP POLICY IF EXISTS "Escritura pública de canciones" ON public.songs;

CREATE POLICY "Escritura pública de estaciones" ON public.stations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Escritura pública de bandas" ON public.bands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Escritura pública de canciones" ON public.songs FOR ALL USING (true) WITH CHECK (true);

-- 2. INSERTAR ESTACIONES INICIALES EN SUPABASE
INSERT INTO public.stations (id, name, genre, description, cover) VALUES
('rock-indie', 'MTV Rock Independiente', 'Indie Rock / Post-Punk', 'Videoclips en vivo, riffs distorsionados y rock garajero independiente.', 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&q=80'),
('synthwave-cyber', 'Synthwave & Cyberpunk TV', 'Synthwave / Retro Electro', 'Videoclips con estética ochentera, luces de neón y carreras de autos futuristas.', 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&q=80'),
('pop-latino-indie', 'Pop Alternativo & Funk', 'Indie Pop / Funk', 'Videoclips llenos de color, ritmos bañados por el sol y grooves bailables.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80')
ON CONFLICT (id) DO NOTHING;

-- 3. INSERTAR BANDAS INICIALES EN SUPABASE
INSERT INTO public.bands (id, name, genre, station_id, bio, cover, instagram) VALUES
('band-1', 'Los Transistores Neón', 'Indie Rock / Post-Punk', 'rock-indie', 'Banda independiente con videoclips cargados de estética analógica y conciertos en directo.', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400&q=80', '@lostransistoresneon'),
('band-2', 'CyberDrive 1984', 'Synthwave / Retro Electro', 'synthwave-cyber', 'Dúo electrónico pionero en la realización de videoclips generados con estética Cyberpunk 3D.', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80', '@cyberdrive84'),
('band-3', 'Luna & El Sabor Solar', 'Indie Pop / Funk', 'pop-latino-indie', 'Grupo groove famoso por sus videoclips llenos de baile y actuaciones en clubes nocturnos.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80', '@lunayasaborsolar')
ON CONFLICT (id) DO NOTHING;

-- 4. INSERTAR CANCIONES Y VIDEOCLIPS INICIALES EN SUPABASE
INSERT INTO public.songs (id, band_id, band_name, title, album, station_id, audio_url, video_url, cover, year) VALUES
('song-1', 'band-1', 'Los Transistores Neón', 'Fuego en el Amplificador', 'Distorsión Nocturna EP', 'rock-indie', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 'https://assets.mixkit.co/videos/preview/mixkit-hands-playing-an-electric-guitar-41582-large.mp4', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400&q=80', 2026),
('song-2', 'band-2', 'CyberDrive 1984', 'Carretera Nocturna a 120 BPM', 'Neon Horizon', 'synthwave-cyber', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 'https://assets.mixkit.co/videos/preview/mixkit-dj-mixing-music-at-a-nightclub-42410-large.mp4', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80', 2026),
('song-3', 'band-3', 'Luna & El Sabor Solar', 'Viernes Bajo las Estrellas', 'Atardecer Funk', 'pop-latino-indie', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 'https://assets.mixkit.co/videos/preview/mixkit-concert-crowd-raising-their-hands-41584-large.mp4', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80', 2026)
ON CONFLICT (id) DO NOTHING;
