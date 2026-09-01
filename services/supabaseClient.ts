
import { createClient } from '@supabase/supabase-js';

// Chaves do LocalStorage (Configuração Manual do Usuário via Interface)
const LS_KEY = 'cla_supabase_key';
const LS_URL = 'cla_supabase_url';

// URL de Fallback Seguro
const DUMMY_URL = 'https://placeholder.supabase.co';

// 1. Recuperar do Storage (Prioridade Máxima para configurações salvas pelo usuário)
const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(LS_URL) : null;
const storedKey = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null;

// 2. Recuperar das Variáveis de Ambiente (.env)
// @ts-ignore
const envUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : '';
// @ts-ignore
const envKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_KEY : '';

// 3. Fallback do Projeto
const PROJECT_URL = 'https://nrvylcgywjrsyrhjootj.supabase.co';
const PROJECT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ydnlsY2d5d2pyc3lyaGpvb3RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MDIxNzgsImV4cCI6MjA4NjA3ODE3OH0.TwgAMcUxtQ9VnO4tlCyOlTwhDHgk7qZf6Vp-tSIE_EQ';

// FUNÇÃO DE VALIDAÇÃO DE CHAVE
const isValidKey = (key: string | null | undefined) => {
    if (!key) return false;
    const cleanKey = key.trim();
    return cleanKey.length > 20 && cleanKey !== 'dummy_key';
};

// DETERMINAR URL E CHAVE FINAIS (Precedência: LocalStorage -> .env -> Fallback Válido)
let finalUrl = DUMMY_URL;
let finalKey = 'dummy_key';

if (storedUrl && storedUrl.startsWith('http') && isValidKey(storedKey)) {
    finalUrl = storedUrl.trim();
    finalKey = storedKey!.trim();
} else if (envUrl && envUrl.startsWith('http') && isValidKey(envKey)) {
    finalUrl = envUrl.trim();
    finalKey = envKey.trim();
} else if (PROJECT_URL && PROJECT_URL.startsWith('http') && isValidKey(PROJECT_KEY) && !PROJECT_URL.includes('nrvylcgywjrsyrhjootj')) {
    finalUrl = PROJECT_URL.trim();
    finalKey = PROJECT_KEY.trim();
}

// ESTADO DA CONEXÃO
export const isSupabaseConfigured = 
  finalUrl !== DUMMY_URL && 
  finalUrl.startsWith('http') &&
  isValidKey(finalKey);

// FUNÇÕES DE CONFIGURAÇÃO VIA INTERFACE
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

// CLIENTE SUPABASE
const safeUrl = isSupabaseConfigured ? finalUrl : DUMMY_URL;
const safeKey = isSupabaseConfigured ? finalKey : 'dummy_key';

console.log(`[Supabase] Status: ${isSupabaseConfigured ? 'ONLINE' : 'OFFLINE (Local)'} | URL: ${safeUrl}`);

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  global: {
    fetch: (url, options) => {
      return fetch(url, options).catch(err => {
        console.warn('[Supabase Client] Erro de rede na requisição (Failed to fetch):', err?.message || err);
        throw err;
      });
    }
  }
});

