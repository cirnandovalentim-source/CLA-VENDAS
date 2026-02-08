
import { createClient } from '@supabase/supabase-js';

// Chaves do LocalStorage (Ainda funcionam se o usuário quiser sobrescrever)
const LS_KEY = 'cla_supabase_key';
const LS_URL = 'cla_supabase_url';

// --- CREDENCIAIS DO PROJETO (CONEXÃO DIRETA) ---
// Configurado automaticamente via solicitação do usuário
const PROJECT_URL = 'https://nrvylcgywjrsyrhjootj.supabase.co';
const PROJECT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ydnlsY2d5d2pyc3lyaGpvb3RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MDIxNzgsImV4cCI6MjA4NjA3ODE3OH0.TwgAMcUxtQ9VnO4tlCyOlTwhDHgk7qZf6Vp-tSIE_EQ';

// --- VALORES DE FALLBACK ---
const DUMMY_URL = 'https://placeholder.supabase.co';

// 1. Recuperar do Storage (caso exista configuração manual)
const storedUrl = localStorage.getItem(LS_URL);
const storedKey = localStorage.getItem(LS_KEY);

// @ts-ignore
const envUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : '';
// @ts-ignore
const envKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_KEY : '';

// FUNÇÃO DE VALIDAÇÃO DE CHAVE
const isValidKey = (key: string | null) => {
    if (!key) return false;
    const cleanKey = key.trim();
    // Validação básica para evitar chaves vazias ou placeholders óbvios
    return cleanKey.length > 20 && cleanKey !== 'dummy_key';
};

// 3. Determinar URL Final
// A Prioridade é: 1. Código Hardcoded (Conexão Direta) -> 2. LocalStorage -> 3. Env -> 4. Padrão
let finalUrl = PROJECT_URL; 
let finalKey = PROJECT_KEY;

// Se a chave hardcoded estiver vazia, tentamos pegar do Storage ou Env
if (!isValidKey(finalKey)) {
    if (storedUrl && storedUrl.includes('http')) {
        finalUrl = storedUrl.trim();
    } else if (envUrl && envUrl.includes('http')) {
        finalUrl = envUrl.trim();
    }

    if (isValidKey(storedKey)) {
        finalKey = storedKey!.trim();
    } else if (isValidKey(envKey)) {
        finalKey = envKey.trim();
    }
}

// 4. Configuração de Estado
export const isSupabaseConfigured = 
  finalUrl !== DUMMY_URL && 
  finalUrl.startsWith('http') &&
  isValidKey(finalKey);

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
// Usamos dados seguros se não estiver configurado para evitar crash na inicialização do objeto
const safeUrl = isSupabaseConfigured ? finalUrl : DUMMY_URL;
const safeKey = isSupabaseConfigured ? finalKey : 'dummy_key';

console.log(`[Supabase] Status: ${isSupabaseConfigured ? 'ONLINE' : 'OFFLINE'} | URL: ${safeUrl}`);

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});
