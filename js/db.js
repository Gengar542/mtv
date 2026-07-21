/* ==========================================================================
   PERSISTENCIA HÍBRIDA: SUPABASE POSTGRESQL CLOUD + INDEXEDDB MIGRATOR
   ========================================================================== */

const DB_NAME = 'SpotifyMTVDB';
const DB_VERSION = 2;

class StationDB {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('stations')) db.createObjectStore('stations', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('bands')) {
                    const bandStore = db.createObjectStore('bands', { keyPath: 'id' });
                    bandStore.createIndex('stationId', 'stationId', { unique: false });
                }
                if (!db.objectStoreNames.contains('songs')) {
                    const songStore = db.createObjectStore('songs', { keyPath: 'id' });
                    songStore.createIndex('stationId', 'stationId', { unique: false });
                    songStore.createIndex('bandId', 'bandId', { unique: false });
                }
            };

            request.onsuccess = async (event) => {
                this.db = event.target.result;
                await this.seedDefaultDataIfEmpty();
                await this.syncLocalToSupabase();
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.error);
                reject(event.target.error);
            };
        });
    }

    async syncLocalToSupabase() {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                const localBands = await this.getAllLocal('bands');
                for (const b of localBands) {
                    const coverUrl = (b.cover && b.cover.length < 100000) ? b.cover : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80';
                    const { error } = await supabaseClient.from('bands').upsert({
                        id: b.id,
                        name: b.name,
                        genre: b.genre,
                        station_id: b.stationId,
                        bio: b.bio || '',
                        cover: coverUrl,
                        instagram: b.instagram || '@banda'
                    });
                    if (error) console.error("Error upserting band to Supabase:", error);
                }

                const localSongs = await this.getAllLocal('songs');
                for (const s of localSongs) {
                    const coverUrl = (s.cover && s.cover.length < 100000) ? s.cover : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80';
                    const { error } = await supabaseClient.from('songs').upsert({
                        id: s.id,
                        band_id: s.bandId,
                        band_name: s.bandName || 'Banda',
                        title: s.title,
                        album: s.album || 'Single',
                        station_id: s.stationId,
                        audio_url: s.audioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                        video_url: s.videoUrl || null,
                        cover: coverUrl,
                        year: s.year || 2026
                    });
                    if (error) console.error("Error upserting song to Supabase:", error);
                }
            } catch (err) {
                console.warn("Error en la sincronización con Supabase:", err);
            }
        }
    }

    async seedDefaultDataIfEmpty() {
        const localStations = await this.getAllLocal('stations');
        if (localStations.length === 0) {
            const audioBlob1 = await this.createSynthesizedAudioTrack('rock');
            const audioBlob2 = await this.createSynthesizedAudioTrack('synth');
            const audioBlob3 = await this.createSynthesizedAudioTrack('pop');

            const sampleVideo1 = "https://assets.mixkit.co/videos/preview/mixkit-concert-crowd-raising-their-hands-41584-large.mp4";
            const sampleVideo2 = "https://assets.mixkit.co/videos/preview/mixkit-dj-mixing-music-at-a-nightclub-42410-large.mp4";
            const sampleVideo3 = "https://assets.mixkit.co/videos/preview/mixkit-hands-playing-an-electric-guitar-41582-large.mp4";

            const defaultStations = [
                { id: 'rock-indie', name: 'MTV Rock Independiente', genre: 'Indie Rock / Post-Punk', description: 'Videoclips en vivo, riffs distorsionados y rock garajero independiente.', cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&q=80' },
                { id: 'synthwave-cyber', name: 'Synthwave & Cyberpunk TV', genre: 'Synthwave / Retro Electro', description: 'Videoclips con estética ochentera, luces de neón y carreras de autos futuristas.', cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&q=80' },
                { id: 'pop-latino-indie', name: 'Pop Alternativo & Funk', genre: 'Indie Pop / Funk', description: 'Videoclips llenos de color, ritmos bañados por el sol y grooves bailables.', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80' }
            ];

            for (const s of defaultStations) await this.putLocal('stations', s);

            const defaultBands = [
                { id: 'band-1', name: 'Los Transistores Neón', genre: 'Indie Rock / Post-Punk', stationId: 'rock-indie', bio: 'Banda independiente con videoclips cargados de estética analógica.', cover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400&q=80', instagram: '@lostransistoresneon' },
                { id: 'band-2', name: 'CyberDrive 1984', genre: 'Synthwave / Retro Electro', stationId: 'synthwave-cyber', bio: 'Dúo electrónico pionero en videoclips Cyberpunk 3D.', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80', instagram: '@cyberdrive84' },
                { id: 'band-3', name: 'Luna & El Sabor Solar', genre: 'Indie Pop / Funk', stationId: 'pop-latino-indie', bio: 'Grupo groove famoso por sus videoclips llenos de baile.', cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80', instagram: '@lunayasaborsolar' }
            ];

            for (const b of defaultBands) await this.putLocal('bands', b);

            const defaultSongs = [
                { id: 'song-1', bandId: 'band-1', bandName: 'Los Transistores Neón', title: 'Fuego en el Amplificador', album: 'Distorsión Nocturna EP', stationId: 'rock-indie', audioBlob: audioBlob1, videoUrl: sampleVideo3, cover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400&q=80', year: 2026 },
                { id: 'song-2', bandId: 'band-2', bandName: 'CyberDrive 1984', title: 'Carretera Nocturna a 120 BPM', album: 'Neon Horizon', stationId: 'synthwave-cyber', audioBlob: audioBlob2, videoUrl: sampleVideo2, cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80', year: 2026 },
                { id: 'song-3', bandId: 'band-3', bandName: 'Luna & El Sabor Solar', title: 'Viernes Bajo las Estrellas', album: 'Atardecer Funk', stationId: 'pop-latino-indie', audioBlob: audioBlob3, videoUrl: sampleVideo1, cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80', year: 2026 }
            ];

            for (const sg of defaultSongs) await this.putLocal('songs', sg);
        }
    }

    async createSynthesizedAudioTrack(style) {
        const sampleRate = 44100;
        const duration = 15;
        const numSamples = sampleRate * duration;
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const buffer = ctx.createBuffer(1, numSamples, sampleRate);
        const data = buffer.getChannelData(0);

        let baseFreq = 220;
        if (style === 'rock') baseFreq = 110;
        if (style === 'synth') baseFreq = 164.81;

        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            const noteIndex = Math.floor(t * 4) % 8;
            const freqs = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2, baseFreq * 1.33];
            const currentFreq = freqs[noteIndex % freqs.length];
            const env = Math.exp(-3 * ((t * 4) % 1));
            const beat = (Math.floor(t * 2) % 2 === 0) ? 0.8 : 0.4;
            data[i] = (Math.sin(2 * Math.PI * currentFreq * t) * 0.4 + (Math.random() * 2 - 1) * 0.05 * beat + (Math.sin(2 * Math.PI * (currentFreq * 0.5) * t) * 0.3)) * env * 0.3;
        }

        return this.bufferToWavBlob(buffer);
    }

    bufferToWavBlob(buffer) {
        const numOfChan = buffer.numberOfChannels, length = buffer.length * numOfChan * 2 + 44, out = new Uint8Array(length), channels = [], sampleRate = buffer.sampleRate;
        let offset = 0, pos = 0;
        function writeString(str) { for (let i = 0; i < str.length; i++) out[pos++] = str.charCodeAt(i); }
        function writeUint32(data) { out[pos++] = data & 0xFF; out[pos++] = (data >> 8) & 0xFF; out[pos++] = (data >> 16) & 0xFF; out[pos++] = (data >> 24) & 0xFF; }
        function writeUint16(data) { out[pos++] = data & 0xFF; out[pos++] = (data >> 8) & 0xFF; }
        writeString('RIFF'); writeUint32(length - 8); writeString('WAVE'); writeString('fmt '); writeUint32(16); writeUint16(1); writeUint16(numOfChan);
        writeUint32(sampleRate); writeUint32(sampleRate * 2 * numOfChan); writeUint16(numOfChan * 2); writeUint16(16); writeString('data'); writeUint32(length - pos - 4);
        for (let i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));
        while (offset < buffer.length) {
            for (let i = 0; i < numOfChan; i++) {
                let sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
                out[pos++] = sample & 0xFF; out[pos++] = (sample >> 8) & 0xFF;
            }
            offset++;
        }
        return new Blob([out], { type: 'audio/wav' });
    }

    async getAll(storeName) {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                const { data, error } = await supabaseClient.from(storeName).select('*');
                if (!error && data && data.length > 0) {
                    return data.map(item => ({
                        ...item,
                        stationId: item.station_id || item.stationId,
                        bandId: item.band_id || item.bandId,
                        bandName: item.band_name || item.bandName,
                        audioUrl: item.audio_url || item.audioUrl,
                        videoUrl: item.video_url || item.videoUrl
                    }));
                }
            } catch (err) {
                console.warn("Supabase fetch fallback to local DB:", err);
            }
        }
        return this.getAllLocal(storeName);
    }

    async put(storeName, value) {
        await this.putLocal(storeName, value);

        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                const coverUrl = (value.cover && value.cover.length < 100000) ? value.cover : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80';

                if (storeName === 'bands') {
                    const { error } = await supabaseClient.from('bands').upsert({
                        id: value.id,
                        name: value.name,
                        genre: value.genre,
                        station_id: value.stationId,
                        bio: value.bio || '',
                        cover: coverUrl,
                        instagram: value.instagram || '@banda'
                    });
                    if (error) console.error("Error upserting band to Supabase:", error);
                    else console.log("✅ Banda guardada en Supabase:", value.name);

                } else if (storeName === 'songs') {
                    const { error } = await supabaseClient.from('songs').upsert({
                        id: value.id,
                        band_id: value.bandId,
                        band_name: value.bandName || 'Banda',
                        title: value.title,
                        album: value.album || 'Single',
                        station_id: value.stationId,
                        audio_url: value.audioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                        video_url: value.videoUrl || null,
                        cover: coverUrl,
                        year: value.year || 2026
                    });
                    if (error) console.error("Error upserting song to Supabase:", error);
                    else console.log("✅ Canción guardada en Supabase:", value.title);

                } else if (storeName === 'stations') {
                    await supabaseClient.from('stations').upsert({
                        id: value.id,
                        name: value.name,
                        genre: value.genre,
                        description: value.description,
                        cover: value.cover
                    });
                }
            } catch (err) {
                console.warn("Supabase upsert warning:", err);
            }
        }
    }

    async getSongsByStation(stationId) {
        const allSongs = await this.getAll('songs');
        return allSongs.filter(s => s.stationId === stationId);
    }

    async getAllLocal(storeName) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async putLocal(storeName, value) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.put(value);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
}

const dbManager = new StationDB();
