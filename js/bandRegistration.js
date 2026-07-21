/* ==========================================================================
   BAND REGISTRATION & MULTIMEDIA UPLOADER MODULE (JPG + VIDEOCLIPS)
   ========================================================================== */

class BandRegistrationModule {
    constructor(dbManager, mtvPlayer) {
        this.db = dbManager;
        this.player = mtvPlayer;
        
        this.audioFileBlob = null;
        this.videoFileBlob = null;
        this.coverDataUrl = null;

        this.initFormEvents();
    }

    async populateStationDropdowns() {
        const stations = await this.db.getAll('stations');
        const select = document.getElementById('target-station');
        const filterSelect = document.getElementById('filter-station-select');
        if (!select) return;

        select.innerHTML = '';
        if (filterSelect) {
            filterSelect.innerHTML = '<option value="all">Todas las Estaciones</option>';
        }

        stations.forEach(st => {
            const opt = document.createElement('option');
            opt.value = st.id;
            opt.textContent = `${st.name} (${st.genre})`;
            select.appendChild(opt);

            if (filterSelect) {
                const fOpt = document.createElement('option');
                fOpt.value = st.id;
                fOpt.textContent = st.name;
                filterSelect.appendChild(fOpt);
            }
        });
    }

    initFormEvents() {
        const form = document.getElementById('band-register-form');
        if (!form) return;

        const nameInput = document.getElementById('band-name');
        const genreInput = document.getElementById('band-genre');
        const stationSelect = document.getElementById('target-station');
        const songInput = document.getElementById('song-title');
        const albumInput = document.getElementById('song-album');

        const updatePreview = () => {
            const selectedStationText = stationSelect.options[stationSelect.selectedIndex]?.text || 'ESTACIÓN';
            document.getElementById('prev-band').textContent = (nameInput.value || 'NOMBRE DE TU BANDA').toUpperCase();
            document.getElementById('prev-song').textContent = (songInput.value || 'TITULO DE TU CANCIÓN').toUpperCase();
            document.getElementById('prev-station').textContent = selectedStationText.split('(')[0].trim().toUpperCase();
            document.getElementById('prev-album').innerHTML = `<i class="fa-solid fa-compact-disc"></i> Álbum: ${albumInput.value || 'Tu Álbum'}`;
            document.getElementById('prev-genre').innerHTML = `<i class="fa-solid fa-music"></i> ${genreInput.value || 'Género'}`;
        };

        [nameInput, genreInput, stationSelect, songInput, albumInput].forEach(el => {
            if (el) el.addEventListener('input', updatePreview);
        });

        // Audio File Handling
        const songFileInput = document.getElementById('song-file');
        songFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.audioFileBlob = e.target.files[0];
                document.getElementById('audio-file-name').textContent = `Audio cargado: ${this.audioFileBlob.name}`;
            }
        });

        // JPG / PNG Image File Handling (FILEREADER TO DATAURL)
        const coverFileInput = document.getElementById('cover-file');
        if (coverFileInput) {
            coverFileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        this.coverDataUrl = evt.target.result;
                        document.getElementById('cover-file-name').textContent = `Imagen JPG cargada: ${file.name}`;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // Video File Handling
        const videoFileInput = document.getElementById('video-file');
        if (videoFileInput) {
            videoFileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.videoFileBlob = e.target.files[0];
                    document.getElementById('video-file-name').textContent = `Videoclip cargado: ${this.videoFileBlob.name}`;
                }
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleFormSubmit();
        });
    }

    async handleFormSubmit() {
        const submitBtn = document.getElementById('btn-submit-band');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publicando Banda, Foto JPG y Videoclip...';

        try {
            const bandId = 'band-' + Date.now();
            const songId = 'song-' + Date.now();

            const bandName = document.getElementById('band-name').value.trim();
            const bandGenre = document.getElementById('band-genre').value.trim();
            const stationId = document.getElementById('target-station').value;
            const bandBio = document.getElementById('band-bio').value.trim();
            const bandInstagram = document.getElementById('band-instagram').value.trim();

            const songTitle = document.getElementById('song-title').value.trim();
            const songAlbum = document.getElementById('song-album').value.trim();
            const videoUrlFallback = document.getElementById('video-url-fallback')?.value.trim();

            // Cover Image Priority: User uploaded JPG > Fallback
            let coverUrl = this.coverDataUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80';

            const newBand = {
                id: bandId,
                name: bandName,
                genre: bandGenre,
                stationId: stationId,
                bio: bandBio,
                cover: coverUrl,
                instagram: bandInstagram,
                registeredAt: new Date().toLocaleDateString('es-ES')
            };

            const newSong = {
                id: songId,
                bandId: bandId,
                bandName: bandName,
                title: songTitle,
                album: songAlbum || 'Single',
                stationId: stationId,
                audioBlob: this.audioFileBlob,
                videoBlob: this.videoFileBlob,
                videoUrl: videoUrlFallback || null,
                cover: coverUrl,
                year: new Date().getFullYear()
            };

            await this.db.put('bands', newBand);
            await this.db.put('songs', newSong);

            alert(`🎬 ¡FELICITACIONES! La banda "${bandName}" y su canción "${songTitle}" han sido registradas. Tu imagen JPG y videoclip están listos para emitirse.`);

            document.getElementById('band-register-form').reset();
            this.audioFileBlob = null;
            this.videoFileBlob = null;
            this.coverDataUrl = null;

            document.getElementById('audio-file-name').textContent = 'Seleccionar archivo de audio';
            document.getElementById('cover-file-name').textContent = 'Subir imagen en JPG, JPEG o PNG';
            document.getElementById('video-file-name').textContent = 'Subir archivo de Video Clip (Opcional)';

            window.app.renderStations();
            window.app.renderBands();
            if (window.app.currentRole === 'admin') {
                window.app.renderAdminDashboard();
            }
            window.app.switchView('mtv-view');
            await this.player.loadStation(stationId, songId);

        } catch (err) {
            console.error("Error al registrar la banda:", err);
            alert("Hubo un error al guardar la banda. Por favor intenta nuevamente.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> PUBLICAR BANDA Y LANZAR VIDEOCLIP';
        }
    }
}
