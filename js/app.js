/* ==========================================================================
   MAIN APPLICATION SPA CONTROLLER (AUTHENTICATION INTEGRATION)
   ========================================================================== */

class App {
    constructor() {
        this.db = dbManager;
        this.auth = authEngine;
        this.visualizer = null;
        this.player = null;
        this.bandModule = null;
    }

    async init() {
        try {
            await this.db.init();

            this.visualizer = new MTVVisualizer('visualizer-canvas', document.getElementById('audio-engine'));
            this.player = new MTVPlayer(this.db, this.visualizer);
            this.bandModule = new BandRegistrationModule(this.db, this.player);
            
            await this.bandModule.populateStationDropdowns();

            this.renderStations();
            this.renderBands();
            this.initNavigation();
            this.initAuthUI();
            this.initLiveClock();
            this.initVisualizerSelector();
            this.initAdminForm();

            // Refresh Session State
            this.updateAuthSessionUI();

            const stations = await this.db.getAll('stations');
            if (stations.length > 0) {
                this.player.loadStation(stations[0].id);
            }

            console.log("Cyber-MTV Broadcast Platform con Autenticación Cifrada activada.");
        } catch (e) {
            console.error("Error al inicializar la plataforma:", e);
        }
    }

    initAuthUI() {
        const modal = document.getElementById('auth-modal');
        const openBtn = document.getElementById('btn-open-auth-modal');
        const closeBtn = document.getElementById('btn-close-auth');
        const logoutBtn = document.getElementById('btn-logout');

        const tabLogin = document.getElementById('tab-btn-login');
        const tabRegister = document.getElementById('tab-btn-register');
        const formLogin = document.getElementById('form-login');
        const formRegister = document.getElementById('form-register');

        // Modal Toggles
        openBtn?.addEventListener('click', () => { if (modal) modal.style.display = 'flex'; });
        closeBtn?.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
        logoutBtn?.addEventListener('click', () => {
            this.auth.logout();
            this.updateAuthSessionUI();
            alert("Has cerrado sesión.");
        });

        // Tabs Toggle
        tabLogin?.addEventListener('click', () => {
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            formLogin.classList.add('active');
            formRegister.classList.remove('active');
        });

        tabRegister?.addEventListener('click', () => {
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            formRegister.classList.add('active');
            formLogin.classList.remove('active');
        });

        // Demo Quick Logins
        document.querySelectorAll('.btn-demo-login').forEach(btn => {
            btn.addEventListener('click', async () => {
                const email = btn.getAttribute('data-email');
                const pass = btn.getAttribute('data-pass');
                document.getElementById('login-email').value = email;
                document.getElementById('login-password').value = pass;
                
                const res = await this.auth.login(email, pass);
                if (res.success) {
                    if (modal) modal.style.display = 'none';
                    this.updateAuthSessionUI();
                    alert(`⚡ Bienvenido/a ${res.user.name} (Rol: ${res.user.role.toUpperCase()})`);
                }
            });
        });

        // Login Form Submit
        formLogin?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            
            const res = await this.auth.login(email, pass);
            if (res.success) {
                if (modal) modal.style.display = 'none';
                formLogin.reset();
                this.updateAuthSessionUI();
                alert(`👋 Bienvenido de vuelta, ${res.user.name}`);
            } else {
                alert("❌ Error: " + res.message);
            }
        });

        // Register Form Submit
        formRegister?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const pass = document.getElementById('reg-password').value;
            const role = document.getElementById('reg-role').value;

            const res = await this.auth.register(name, email, pass, role);
            if (res.success) {
                if (modal) modal.style.display = 'none';
                formRegister.reset();
                this.updateAuthSessionUI();
                alert(`🎉 ¡Cuenta creada con éxito! Tu contraseña se ha cifrado mediante SHA-256. Rol: ${role.toUpperCase()}`);
            }
        });
    }

    updateAuthSessionUI() {
        const user = this.auth.currentUser;
        const loggedBadge = document.getElementById('user-logged-badge');
        const openAuthBtn = document.getElementById('btn-open-auth-modal');
        const headerEmail = document.getElementById('header-user-email');
        const headerRole = document.getElementById('header-role-badge');

        const navRegisterBtn = document.getElementById('nav-btn-register');
        const headerQuickReg = document.getElementById('btn-quick-register');
        const adminNavBtn = document.getElementById('nav-btn-admin');

        const roleSelect = document.getElementById('role-select');

        if (user) {
            if (loggedBadge) loggedBadge.style.display = 'flex';
            if (openAuthBtn) openAuthBtn.style.display = 'none';
            if (headerEmail) headerEmail.textContent = user.email;
            if (headerRole) headerRole.textContent = user.role.toUpperCase();
            if (roleSelect) roleSelect.value = user.role;

            if (user.role === 'admin') {
                if (navRegisterBtn) navRegisterBtn.style.display = 'flex';
                if (headerQuickReg) headerQuickReg.style.display = 'inline-flex';
                if (adminNavBtn) adminNavBtn.style.display = 'flex';
            } else if (user.role === 'banda') {
                if (navRegisterBtn) navRegisterBtn.style.display = 'flex';
                if (headerQuickReg) headerQuickReg.style.display = 'inline-flex';
                if (adminNavBtn) adminNavBtn.style.display = 'none';
            } else {
                if (navRegisterBtn) navRegisterBtn.style.display = 'none';
                if (headerQuickReg) headerQuickReg.style.display = 'none';
                if (adminNavBtn) adminNavBtn.style.display = 'none';
            }
        } else {
            if (loggedBadge) loggedBadge.style.display = 'none';
            if (openAuthBtn) openAuthBtn.style.display = 'inline-flex';
            if (navRegisterBtn) navRegisterBtn.style.display = 'none';
            if (headerQuickReg) headerQuickReg.style.display = 'none';
            if (adminNavBtn) adminNavBtn.style.display = 'none';
        }
    }

    initNavigation() {
        const navBtns = document.querySelectorAll('.console-nav-btn[data-view]');
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const viewId = btn.getAttribute('data-view');
                this.switchView(viewId);
            });
        });

        document.getElementById('btn-quick-register')?.addEventListener('click', () => this.switchView('register-view'));
    }

    switchView(viewId) {
        document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
        document.querySelectorAll('.console-nav-btn').forEach(btn => btn.classList.remove('active'));

        const targetSection = document.getElementById(viewId);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        const activeBtn = document.querySelector(`.console-nav-btn[data-view="${viewId}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        if (viewId === 'admin-view') {
            this.renderAdminDashboard();
        }

        if (viewId === 'mtv-view' && this.visualizer) {
            setTimeout(() => this.visualizer.initCanvasSize(), 100);
        }
    }

    async renderStations() {
        const stationsGrid = document.getElementById('stations-grid');
        const quickList = document.getElementById('quick-stations');
        if (!stationsGrid) return;

        const stations = await this.db.getAll('stations');
        const allSongs = await this.db.getAll('songs');

        stationsGrid.innerHTML = '';
        if (quickList) quickList.innerHTML = '';

        stations.forEach((st, idx) => {
            const stationSongs = allSongs.filter(s => s.stationId === st.id);
            
            const card = document.createElement('div');
            card.className = 'station-card';
            card.innerHTML = `
                <img class="station-card-image" src="${st.cover}" alt="${st.name}">
                <h3 style="font-size:1.1rem; font-weight:800;">${st.name}</h3>
                <p style="color:var(--text-dim); font-size:0.85rem; margin-top:4px;">${st.description}</p>
                <div style="margin-top:12px; font-size:0.75rem; font-family:var(--font-mono); color:var(--cyber-cyan);">
                    <i class="fa-solid fa-film"></i> ${stationSongs.length} temas y videoclips
                </div>
            `;
            card.addEventListener('click', () => {
                this.switchView('mtv-view');
                this.player.loadStation(st.id);
            });
            stationsGrid.appendChild(card);

            if (quickList) {
                const chBtn = document.createElement('div');
                chBtn.className = 'channel-btn';
                chBtn.setAttribute('data-station-id', st.id);
                chBtn.innerHTML = `
                    <span><i class="fa-solid fa-play" style="font-size:0.7rem; margin-right:6px;"></i> ${st.name}</span>
                    <span class="ch-badge">CH-0${idx + 1}</span>
                `;
                chBtn.addEventListener('click', () => {
                    this.switchView('mtv-view');
                    this.player.loadStation(st.id);
                });
                quickList.appendChild(chBtn);
            }
        });
    }

    async renderBands(stationFilter = 'all') {
        const bandsGrid = document.getElementById('bands-grid');
        if (!bandsGrid) return;

        let bands = await this.db.getAll('bands');
        const allSongs = await this.db.getAll('songs');

        if (stationFilter !== 'all') {
            bands = bands.filter(b => b.stationId === stationFilter);
        }

        bandsGrid.innerHTML = '';

        if (bands.length === 0) {
            bandsGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">
                    <i class="fa-solid fa-film" style="font-size: 3rem; margin-bottom: 12px; color:var(--cyber-magenta);"></i>
                    <p>No hay bandas registradas en esta estación todavía.</p>
                </div>
            `;
            return;
        }

        bands.forEach(band => {
            const bandSongs = allSongs.filter(s => s.bandId === band.id);
            
            const card = document.createElement('div');
            card.className = 'band-card';
            
            const songsHtml = bandSongs.map(s => `
                <div class="band-track-item" data-song-id="${s.id}" data-station-id="${s.stationId}">
                    <span><i class="fa-solid fa-circle-play" style="color:var(--cyber-cyan);"></i> ${s.title}</span>
                    ${s.videoUrl || s.videoBlob ? '<span style="font-size:0.65rem; background:var(--cyber-magenta); color:#fff; padding:1px 4px;">VIDEO</span>' : ''}
                </div>
            `).join('');

            card.innerHTML = `
                <div class="band-card-header">
                    <img class="band-avatar" src="${band.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&q=80'}" alt="${band.name}">
                    <div>
                        <h3 style="font-size:1.05rem; font-weight:800;">${band.name}</h3>
                        <span style="font-size:0.75rem; color:var(--cyber-cyan); font-family:var(--font-mono);">${band.genre}</span>
                    </div>
                </div>
                <p style="font-size:0.85rem; color:var(--text-dim); margin-bottom:12px; line-height:1.4;">${band.bio || 'Banda independiente en la red de videoclips MTV.'}</p>
                <div style="margin-top:auto;">
                    <strong style="font-size:0.7rem; font-family:var(--font-mono); color:var(--cyber-gold); display:block; margin-bottom:4px;">VIDEOCLIPS & CANCIONES:</strong>
                    ${songsHtml}
                </div>
            `;

            card.querySelectorAll('.band-track-item').forEach(trackEl => {
                trackEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const songId = trackEl.getAttribute('data-song-id');
                    const stId = trackEl.getAttribute('data-station-id');
                    this.switchView('mtv-view');
                    this.player.loadStation(stId, songId);
                });
            });

            bandsGrid.appendChild(card);
        });

        const filterSelect = document.getElementById('filter-station-select');
        if (filterSelect && !filterSelect.dataset.hasListener) {
            filterSelect.addEventListener('change', (e) => {
                this.renderBands(e.target.value);
            });
            filterSelect.dataset.hasListener = 'true';
        }
    }

    /* ADMIN DASHBOARD */
    async renderAdminDashboard() {
        const bandsTable = document.getElementById('admin-bands-table-body');
        const songsTable = document.getElementById('admin-songs-table-body');
        if (!bandsTable || !songsTable) return;

        const bands = await this.db.getAll('bands');
        const songs = await this.db.getAll('songs');
        const stations = await this.db.getAll('stations');

        document.getElementById('admin-total-bands').textContent = bands.length;
        document.getElementById('admin-total-songs').textContent = songs.length;

        // Bands Table
        bandsTable.innerHTML = '';
        bands.forEach(band => {
            const stName = stations.find(s => s.id === band.stationId)?.name || 'Estación N/A';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${band.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&q=80'}" alt="${band.name}"></td>
                <td><strong>${band.name}</strong></td>
                <td><span style="color:var(--cyber-cyan);">${band.genre}</span></td>
                <td>${stName}</td>
                <td>${band.instagram || 'N/A'}</td>
                <td>
                    <button class="btn btn-sm btn-danger btn-delete-band" data-band-id="${band.id}">
                        <i class="fa-solid fa-trash"></i> Eliminar
                    </button>
                </td>
            `;
            tr.querySelector('.btn-delete-band').addEventListener('click', async () => {
                if (confirm(`¿Eliminar la banda "${band.name}" de la plataforma?`)) {
                    await this.deleteBand(band.id);
                }
            });
            bandsTable.appendChild(tr);
        });

        // Songs Table
        songsTable.innerHTML = '';
        songs.forEach(song => {
            const stName = stations.find(s => s.id === song.stationId)?.name || 'Estación N/A';
            const hasVideo = song.videoUrl || song.videoBlob;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${song.title}</strong></td>
                <td>${song.bandName || 'Banda'}</td>
                <td>${song.album || 'Single'}</td>
                <td>
                    ${song.audioBlob || song.audioUrl ? '<span style="font-size:0.7rem; background:rgba(0,240,255,0.2); color:var(--cyber-cyan); padding:2px 6px; margin-right:4px;">AUDIO HD</span>' : ''}
                    ${hasVideo ? '<span style="font-size:0.7rem; background:var(--cyber-magenta); color:#fff; padding:2px 6px;">VIDEOCLIP MP4</span>' : ''}
                </td>
                <td>${stName}</td>
                <td>
                    <button class="btn btn-sm btn-cyber-primary btn-air-song" data-song-id="${song.id}" data-station-id="${song.stationId}">
                        <i class="fa-solid fa-tower-broadcast"></i> Lanzar al Aire
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete-song" data-song-id="${song.id}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tr.querySelector('.btn-air-song').addEventListener('click', () => {
                this.switchView('mtv-view');
                this.player.loadStation(song.stationId, song.id);
            });
            tr.querySelector('.btn-delete-song').addEventListener('click', async () => {
                if (confirm(`¿Eliminar la canción "${song.title}"?`)) {
                    await this.deleteSong(song.id);
                }
            });
            songsTable.appendChild(tr);
        });
    }

    async deleteBand(bandId) {
        const tx = this.db.db.transaction(['bands', 'songs'], 'readwrite');
        tx.objectStore('bands').delete(bandId);
        
        const songStore = tx.objectStore('songs');
        const index = songStore.index('bandId');
        const req = index.getAllKeys(bandId);
        req.onsuccess = () => {
            req.result.forEach(key => songStore.delete(key));
        };

        tx.oncomplete = () => {
            this.renderAdminDashboard();
            this.renderBands();
            this.renderStations();
        };
    }

    async deleteSong(songId) {
        const tx = this.db.db.transaction('songs', 'readwrite');
        tx.objectStore('songs').delete(songId);
        tx.oncomplete = () => {
            this.renderAdminDashboard();
            this.renderBands();
            this.renderStations();
        };
    }

    initAdminForm() {
        const adminForm = document.getElementById('admin-add-station-form');
        if (!adminForm) return;

        adminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('new-station-id').value.trim();
            const name = document.getElementById('new-station-name').value.trim();
            const genre = document.getElementById('new-station-genre').value.trim();
            const desc = document.getElementById('new-station-desc').value.trim();

            const newStation = {
                id: id,
                name: name,
                genre: genre,
                description: desc,
                cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80'
            };

            await this.db.put('stations', newStation);
            alert(`Estación "${name}" creada exitosamente.`);
            adminForm.reset();
            
            await this.bandModule.populateStationDropdowns();
            this.renderStations();
            this.renderAdminDashboard();
        });
    }

    initLiveClock() {
        const clockEl = document.getElementById('live-clock');
        if (!clockEl) return;
        setInterval(() => {
            const now = new Date();
            clockEl.textContent = now.toTimeString().split(' ')[0];
        }, 1000);
    }

    initVisualizerSelector() {
        const selector = document.getElementById('vis-mode-select');
        if (selector) {
            selector.addEventListener('change', (e) => {
                if (this.visualizer) {
                    this.visualizer.setMode(e.target.value);
                }
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
});
