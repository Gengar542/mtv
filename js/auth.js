/* ==========================================================================
   AUTHENTICATION ENGINE WITH SHA-256 ENCRYPTED PASSWORDS
   ========================================================================== */

class AuthEngine {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('mtv_user_session')) || null;
    }

    // SHA-256 Cryptographic Hash Function
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Iniciar Sesión (Login)
    async login(email, password) {
        const hashedPassword = await this.hashPassword(password);

        // 1. Intentar autenticar en Supabase PostgreSQL
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('users')
                    .select('*')
                    .eq('email', email.toLowerCase().trim())
                    .eq('password_hash', hashedPassword)
                    .single();

                if (!error && data) {
                    this.setCurrentUser(data);
                    return { success: true, user: data };
                }
            } catch (err) {
                console.warn("Error en login Supabase:", err);
            }
        }

        // 2. Fallback Usuarios Precargados Locales
        const defaultUsers = [
            { id: 'user-admin-1', email: 'admin@mtv.com', password_hash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', role: 'admin', name: 'Director Admin MTV' },
            { id: 'user-banda-1', email: 'banda@mtv.com', password_hash: '80509653835697658c27cf9487c95e1e1a5332f1434cfa7ef9ecdd268b812f8e', role: 'banda', name: 'Banda Músico Demo' },
            { id: 'user-oyente-1', email: 'oyente@mtv.com', password_hash: 'c7e2c9ef895690b20be8e02d6b38c2013f41249767fa668ef7321e0ca65463f2', role: 'oyente', name: 'Usuario Oyente Demo' }
        ];

        const localUser = defaultUsers.find(u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password_hash === hashedPassword);
        if (localUser) {
            this.setCurrentUser(localUser);
            return { success: true, user: localUser };
        }

        return { success: false, message: "Correo o contraseña incorrectos." };
    }

    // Registrar Usuario o Banda (Sign Up)
    async register(name, email, password, role) {
        const hashedPassword = await this.hashPassword(password);
        const newUser = {
            id: 'user-' + Date.now(),
            name: name,
            email: email.toLowerCase().trim(),
            password_hash: hashedPassword, // GUARDADO CIFRADO EN SHA-256
            role: role // 'oyente' | 'banda' | 'admin'
        };

        // Guardar en Supabase PostgreSQL
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                const { error } = await supabaseClient.from('users').insert([{
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    password_hash: newUser.password_hash,
                    role: newUser.role
                }]);
                if (error) console.error("Error al registrar usuario en Supabase:", error);
            } catch (err) {
                console.warn("Supabase register warning:", err);
            }
        }

        this.setCurrentUser(newUser);
        return { success: true, user: newUser };
    }

    setCurrentUser(user) {
        this.currentUser = user;
        localStorage.setItem('mtv_user_session', JSON.stringify(user));
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('mtv_user_session');
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    getRole() {
        return this.currentUser ? this.currentUser.role : 'oyente';
    }
}

const authEngine = new AuthEngine();
