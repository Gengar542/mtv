/* ==========================================================================
   MTV BROADCAST ENGINE WITH VIDEO CLIP SYNCHRONIZATION
   ========================================================================== */

class MTVPlayer {
    constructor(dbManager, visualizer) {
        this.db = dbManager;
        this.visualizer = visualizer;
        this.audio = document.getElementById('audio-engine');
        this.video = document.getElementById('video-engine');
        
        this.currentStation = null;
        this.currentStationSongs = [];
        this.currentSongIndex = -1;
        this.currentSong = null;
        this.isRadioContinuousMode = true;
        this.forceVisualizerMode = false;

        this.lowerThirdTimer = null;

        this.initEventListeners();
    }

    initEventListeners() {
        // Audio Engine Events
        this.audio.addEventListener('play', () => {
            this.updatePlayPauseIcon(true);
            this.visualizer.setupAudioContext();
            this.visualizer.start();
            if (this.video && this.video.src) {
                this.video.play().catch(e => console.log("Video autoplay suppressed:", e));
            }
        });

        this.audio.addEventListener('pause', () => {
            this.updatePlayPauseIcon(false);
            if (this.video) this.video.pause();
        });

        this.audio.addEventListener('ended', () => {
            if (this.isRadioContinuousMode) {
                this.playNextTrack();
            }
        });

        this.audio.addEventListener('timeupdate', () => {
            this.updateProgress();
            // Keep video synchronized with audio
            if (this.video && !this.video.paused && Math.abs(this.video.currentTime - this.audio.currentTime) > 0.5) {
                this.video.currentTime = this.audio.currentTime;
            }
        });

        // Player Deck Controls
        document.getElementById('btn-play-pause').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('btn-next-track').addEventListener('click', () => this.playNextTrack());
        document.getElementById('btn-prev-track').addEventListener('click', () => this.playPrevTrack());

        // Volume Control
        const volSlider = document.getElementById('volume-slider');
        volSlider.addEventListener('input', (e) => {
            this.audio.volume = parseFloat(e.target.value);
            const icon = document.getElementById('vol-icon');
            if (this.audio.volume === 0) icon.className = 'fa-solid fa-volume-xmark';
            else if (this.audio.volume < 0.5) icon.className = 'fa-solid fa-volume-low';
            else icon.className = 'fa-solid fa-volume-high';
        });

        // Progress Bar Seek
        document.getElementById('progress-wrapper').addEventListener('click', (e) => {
            if (!this.audio.duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            const targetTime = percentage * this.audio.duration;
            this.audio.currentTime = targetTime;
            if (this.video) this.video.currentTime = targetTime;
        });

        // Radio Continuous Toggle
        document.getElementById('btn-radio-mode').addEventListener('click', (e) => {
            this.isRadioContinuousMode = !this.isRadioContinuousMode;
            e.currentTarget.classList.toggle('toggle-active', this.isRadioContinuousMode);
        });

        // CRT Filter Toggle
        document.getElementById('btn-crt-toggle').addEventListener('click', () => {
            document.getElementById('crt-overlay').classList.toggle('active');
        });

        // Toggle Video vs Visualizer Mode
        document.getElementById('btn-toggle-media-mode').addEventListener('click', () => {
            this.forceVisualizerMode = !this.forceVisualizerMode;
            document.getElementById('lbl-media-toggle').textContent = this.forceVisualizerMode ? 'Ver Videoclip' : 'Ver Visualizador';
            this.updateMediaViewport();
        });

        // Fullscreen
        document.getElementById('btn-fullscreen').addEventListener('click', () => {
            const container = document.getElementById('mtv-screen-container');
            if (!document.fullscreenElement) {
                container.requestFullscreen().catch(err => console.warn(err));
            } else {
                document.exitFullscreen();
            }
        });
    }

    async loadStation(stationId, startSongId = null) {
        const stations = await this.db.getAll('stations');
        this.currentStation = stations.find(s => s.id === stationId);
        if (!this.currentStation) return;

        this.currentStationSongs = await this.db.getSongsByStation(stationId);
        if (this.currentStationSongs.length === 0) {
            alert(`La estación "${this.currentStation.name}" no tiene canciones registradas aún.`);
            return;
        }

        // Update station header text
        document.getElementById('mtv-current-station-name').textContent = this.currentStation.name.toUpperCase();
        document.getElementById('player-station-badge').textContent = `ESTACIÓN: ${this.currentStation.name.toUpperCase()}`;

        // Highlight active channel button
        document.querySelectorAll('.channel-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-station-id') === stationId);
        });

        if (startSongId) {
            this.currentSongIndex = this.currentStationSongs.findIndex(s => s.id === startSongId);
        } else {
            this.currentSongIndex = 0;
        }

        await this.playSong(this.currentStationSongs[this.currentSongIndex]);
        this.renderQueueList();
    }

    async playSong(song) {
        if (!song) return;
        this.currentSong = song;

        const bands = await this.db.getAll('bands');
        const bandInfo = bands.find(b => b.id === song.bandId) || {
            name: song.bandName || 'Banda Independiente',
            genre: 'Indie Rock',
            bio: 'Banda inscrita en la red de videoclips de MTV.',
            instagram: '@banda'
        };

        // Prepare Audio
        if (song.audioBlob) {
            this.audio.src = URL.createObjectURL(song.audioBlob);
        } else if (song.audioUrl) {
            this.audio.src = song.audioUrl;
        }

        // Prepare Video Clip
        if (song.videoBlob) {
            this.video.src = URL.createObjectURL(song.videoBlob);
            this.video.muted = true; // Audio is handled by audio-engine for Web Audio visualizer
        } else if (song.videoUrl) {
            this.video.src = song.videoUrl;
            this.video.muted = true;
        } else {
            this.video.removeAttribute('src');
        }

        this.audio.play().catch(e => console.log("Play triggered:", e));

        this.updateMediaViewport();
        this.updatePlayerUI(song, bandInfo);

        // TRIGGER SIGNATURE MTV LOWER THIRD BANNER
        this.triggerMTVLowerThird(song, bandInfo);
    }

    updateMediaViewport() {
        const hasVideo = (this.video && this.video.src && !this.forceVisualizerMode);
        const canvasEl = document.getElementById('visualizer-canvas');
        const videoModeBadge = document.getElementById('media-mode-badge');

        if (hasVideo) {
            this.video.classList.add('active');
            canvasEl.classList.add('hidden');
            videoModeBadge.classList.add('active');
        } else {
            this.video.classList.remove('active');
            canvasEl.classList.remove('hidden');
            videoModeBadge.classList.remove('active');
        }
    }

    updatePlayerUI(song, bandInfo) {
        document.getElementById('player-song-title').textContent = song.title;
        document.getElementById('player-band-name').textContent = song.bandName || bandInfo.name;
        
        const coverSrc = song.cover || bandInfo.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&q=80';
        document.getElementById('player-thumb').src = coverSrc;

        document.getElementById('mtv-big-cover').src = coverSrc;
        document.getElementById('mtv-info-song-title').textContent = song.title;
        document.getElementById('mtv-info-band-name').textContent = song.bandName || bandInfo.name;
        document.getElementById('mtv-info-band-bio').textContent = bandInfo.bio || 'Sin biografía disponible.';
        document.getElementById('mtv-info-station-badge').textContent = `ESTACIÓN: ${this.currentStation ? this.currentStation.name : 'INDIE'}`;
        
        const socials = document.getElementById('mtv-info-socials');
        socials.innerHTML = `
            ${bandInfo.instagram ? `<a href="https://instagram.com/${bandInfo.instagram.replace('@','')}" target="_blank" class="btn btn-cyber-outline"><i class="fa-brands fa-instagram"></i> ${bandInfo.instagram}</a>` : ''}
            ${song.videoUrl || song.videoBlob ? `<span class="badge-new"><i class="fa-solid fa-clapperboard"></i> VIDEOCLIP DISPONIBLE</span>` : ''}
        `;
    }

    triggerMTVLowerThird(song, bandInfo) {
        const lowerThird = document.getElementById('mtv-lower-third');
        
        document.getElementById('lt-station').textContent = this.currentStation ? this.currentStation.name.toUpperCase() : 'MTV INDIE';
        document.getElementById('lt-song').textContent = song.title.toUpperCase();
        document.getElementById('lt-band').textContent = (song.bandName || bandInfo.name).toUpperCase();
        document.getElementById('lt-album').innerHTML = `<i class="fa-solid fa-compact-disc"></i> Álbum: ${song.album || 'Single'}`;
        document.getElementById('lt-director').innerHTML = `<i class="fa-solid fa-clapperboard"></i> Dir: Videoclip Oficial`;
        document.getElementById('lt-year').innerHTML = `<i class="fa-solid fa-calendar"></i> ${song.year || 2026}`;

        lowerThird.classList.add('visible');

        if (this.lowerThirdTimer) clearTimeout(this.lowerThirdTimer);

        // Auto-hide lower-third banner after 7 seconds
        this.lowerThirdTimer = setTimeout(() => {
            lowerThird.classList.remove('visible');
        }, 7000);
    }

    togglePlayPause() {
        if (!this.audio.src) {
            this.loadStation('rock-indie');
            return;
        }
        if (this.audio.paused) {
            this.audio.play();
            if (this.video && this.video.src) this.video.play();
        } else {
            this.audio.pause();
            if (this.video) this.video.pause();
        }
    }

    playNextTrack() {
        if (this.currentStationSongs.length === 0) return;
        this.currentSongIndex = (this.currentSongIndex + 1) % this.currentStationSongs.length;
        this.playSong(this.currentStationSongs[this.currentSongIndex]);
        this.renderQueueList();
    }

    playPrevTrack() {
        if (this.currentStationSongs.length === 0) return;
        this.currentSongIndex = (this.currentSongIndex - 1 + this.currentStationSongs.length) % this.currentStationSongs.length;
        this.playSong(this.currentStationSongs[this.currentSongIndex]);
        this.renderQueueList();
    }

    updatePlayPauseIcon(isPlaying) {
        const btn = document.getElementById('btn-play-pause');
        btn.innerHTML = isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
    }

    updateProgress() {
        if (!this.audio.duration) return;
        const current = this.audio.currentTime;
        const duration = this.audio.duration;
        const percent = (current / duration) * 100;

        document.getElementById('progress-fill').style.width = `${percent}%`;
        document.getElementById('time-current').textContent = this.formatTime(current);
        document.getElementById('time-total').textContent = this.formatTime(duration);
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    renderQueueList() {
        const queueContainer = document.getElementById('mtv-queue-list');
        if (!queueContainer) return;

        queueContainer.innerHTML = '';
        this.currentStationSongs.forEach((song, idx) => {
            const isPlaying = idx === this.currentSongIndex;
            const item = document.createElement('div');
            item.className = `queue-item ${isPlaying ? 'playing' : ''}`;
            item.innerHTML = `
                <img src="${song.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&q=80'}">
                <div class="queue-item-info">
                    <span class="queue-item-title">${song.title} ${song.videoUrl || song.videoBlob ? '<i class="fa-solid fa-clapperboard" style="color:var(--cyber-magenta); margin-left:4px;"></i>' : ''}</span>
                    <span class="queue-item-band">${song.bandName || 'Banda'}</span>
                </div>
            `;
            item.addEventListener('click', () => {
                this.currentSongIndex = idx;
                this.playSong(song);
                this.renderQueueList();
            });
            queueContainer.appendChild(item);
        });
    }
}
