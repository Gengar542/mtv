/* ==========================================================================
   SUPABASE CLOUD CLIENT INTEGRATION
   ========================================================================== */

const SUPABASE_URL = "https://ksukohrbgzkbpzyiitrz.supabase.co";
// Reemplaza esta clave con la clave pública 'anon' de tu proyecto Supabase:
// Supabase Dashboard > Project Settings > API > anon (public) key
const SUPABASE_ANON_KEY = "TU_SUPABASE_ANON_KEY_AQUI";

let supabaseClient = null;

if (window.supabase && SUPABASE_ANON_KEY !== "TU_SUPABASE_ANON_KEY_AQUI") {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Conectado a Supabase PostgreSQL Cloud.");
} else {
    console.log("Supabase anon key no configurada aún. Usando persistencia local como fallback.");
}
