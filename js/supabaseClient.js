/* ==========================================================================
   SUPABASE CLOUD CLIENT INTEGRATION
   ========================================================================== */

const SUPABASE_URL = "https://ksukohrbgzkbpzyiitrz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_r_WSqJgNuwvtZFibuA04AQ_aHA25LEE";

let supabaseClient = null;

if (window.supabase && SUPABASE_ANON_KEY) {
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("⚡ Supabase PostgreSQL Cloud listo y conectado.");
    } catch (e) {
        console.warn("No se pudo iniciar Supabase SDK:", e);
    }
}
