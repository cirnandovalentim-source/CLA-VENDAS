
import { createClient } from '@supabase/supabase-js';

// Chaves do LocalStorage
const LS_KEY = 'cla_supabase_key';
const LS_URL = 'cla_supabase_url';

// --- CREDENCIAIS DO PROJETO (Fornecidas pelo Usuário) ---
// Separamos a string fornecida:
// URL: https://taubsuolhawpdibrhtkb.supabase.co
// Key: sb_publishable_8ZQqb0ErWyz5oP_BWQqECQ_Ospm1Q08
const PROJECT_URL = 'https://taubsuolhawpdibrhtkb.supabase.co';
const PROJECT_KEY = 'sb_publishable_8ZQqb0ErWyz5oP_BWQqECQ_Ospm1Q08'; 

// --- VALORES DE FALLBACK ---
const DUMMY_URL = 'https://placeholder.supabase.co';

// 1. Recuperar do Storage (Prioridade Máxima - permite override manual)
const storedUrl = localStorage.getItem(LS_URL);
const storedKey = localStorage.getItem(LS_KEY);

// 2. Recuperar do Env (opcional)
// @ts-ignore
const envUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : '';
// @ts-ignore
const envKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_KEY : '';

// 3. Determinar URL Final
let finalUrl = PROJECT_URL; // Default para o projeto do usuário
let finalKey = PROJECT_KEY;

// Se houver override no Storage, usa ele
if (storedUrl && storedUrl.includes('http')) {
    finalUrl = storedUrl.trim();
} else if (envUrl && envUrl.includes('http')) {
    finalUrl = envUrl.trim();
}

if (storedKey && storedKey.length > 5) {
    finalKey = storedKey.trim();
} else if (envKey && envKey.length > 5) {
    finalKey = envKey.trim();
}

// 4. Configuração de Estado
// Consideramos configurado se a URL for válida e não for o placeholder dummy
export const isSupabaseConfigured = 
  finalUrl !== DUMMY_URL && 
  finalUrl.startsWith('http') &&
  finalKey.length > 0;

// 5. Funções Auxiliares
export const configureSupabase = (key: string, url: string) => {
  if (key) localStorage.setItem(LS_KEY, key.trim());
  if (url) localStorage.setItem(LS_URL, url.trim());
  window.location.reload(); 
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem(LS_KEY);
  localStorage.removeItem(LS_URL);
  window.location.reload();
};

// 6. Criar Cliente
export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});
