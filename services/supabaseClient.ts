
import { createClient } from '@supabase/supabase-js';

// Chaves do LocalStorage (Configuração Manual do Usuário via Interface)
const LS_KEY = 'cla_supabase_key';
const LS_URL = 'cla_supabase_url';

// URL de Fallback Seguro
const DUMMY_URL = 'https://placeholder.supabase.co';

// FUNÇÃO DE HIGIENIZAÇÃO DE URL
export const sanitizeSupabaseUrl = (url: string): string => {
    if (!url) return '';
    let clean = url.trim().replace(/["']/g, ''); // Remove aspas acidentais
    if (clean.endsWith('/')) {
        clean = clean.slice(0, -1);
    }
    if (clean.startsWith('http://')) {
        clean = clean.replace('http://', 'https://');
    }
    if (!clean.startsWith('https://') && !clean.startsWith('postgres://') && !clean.startsWith('postgresql://')) {
        clean = 'https://' + clean;
    }
    return clean;
};

// FUNÇÃO DE HIGIENIZAÇÃO DE CHAVE
export const sanitizeSupabaseKey = (key: string): string => {
    if (!key) return '';
    return key.trim().replace(/["']/g, ''); // Remove aspas acidentais
};

// 1. Recuperar do Storage
const rawStoredUrl = typeof window !== 'undefined' ? localStorage.getItem(LS_URL) : null;
const rawStoredKey = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null;

const storedUrl = rawStoredUrl ? sanitizeSupabaseUrl(rawStoredUrl) : null;
const storedKey = rawStoredKey ? sanitizeSupabaseKey(rawStoredKey) : null;

// 2. Recuperar das Variáveis de Ambiente (.env)
// @ts-ignore
const envUrlRaw = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : '';
// @ts-ignore
const envKeyRaw = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_KEY : '';

const envUrl = envUrlRaw ? sanitizeSupabaseUrl(envUrlRaw) : '';
const envKey = envKeyRaw ? sanitizeSupabaseKey(envKeyRaw) : '';

// 3. Fallback do Projeto
const PROJECT_URL = 'https://hqujabdaxeuqjfbvwmcb.supabase.co';
const PROJECT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxdWphYmRheGV1cWpmYnZ3bWNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MjY1MjYsImV4cCI6MjA4NjAwMjUyNn0.MoUE0s_ClcAeH8kr3UiN5t1D7IxIWxBDRxwQZkmR8Zc';

// VALIDAÇÃO DE CHAVE
const isValidKey = (key: string | null | undefined) => {
    if (!key) return false;
    const cleanKey = sanitizeSupabaseKey(key);
    return cleanKey.length > 20 && cleanKey !== 'dummy_key' && !cleanKey.startsWith('sbp_');
};

// DETERMINAR URL E CHAVE FINAIS (Precedência: LocalStorage -> .env -> Fallback Válido)
let finalUrl = DUMMY_URL;
let finalKey = 'dummy_key';

if (storedUrl && storedUrl.startsWith('https://') && isValidKey(storedKey)) {
    finalUrl = storedUrl;
    finalKey = storedKey!;
} else if (envUrl && envUrl.startsWith('https://') && isValidKey(envKey)) {
    finalUrl = envUrl;
    finalKey = envKey;
} else if (PROJECT_URL && PROJECT_URL.startsWith('https://') && isValidKey(PROJECT_KEY)) {
    finalUrl = PROJECT_URL;
    finalKey = PROJECT_KEY;
}

// ESTADO DA CONEXÃO
export const isSupabaseConfigured = 
  finalUrl !== DUMMY_URL && 
  finalUrl.startsWith('https://') &&
  isValidKey(finalKey);

// FUNÇÕES DE CONFIGURAÇÃO VIA INTERFACE
export const configureSupabase = (key: string, url: string) => {
  const cleanKey = sanitizeSupabaseKey(key);
  const cleanUrl = sanitizeSupabaseUrl(url);
  if (cleanKey) localStorage.setItem(LS_KEY, cleanKey);
  if (cleanUrl) localStorage.setItem(LS_URL, cleanUrl);
  window.location.reload(); 
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem(LS_KEY);
  localStorage.removeItem(LS_URL);
  window.location.reload();
};

// TESTADOR DE CONEXÃO AO VIVO
export const testSupabaseConnection = async (rawUrl: string, rawKey: string): Promise<{
    success: boolean;
    needsSetup?: boolean;
    message: string;
    cleanUrl: string;
    cleanKey: string;
}> => {
    const cleanUrl = sanitizeSupabaseUrl(rawUrl);
    const cleanKey = sanitizeSupabaseKey(rawKey);

    if (!cleanUrl) {
        return { success: false, message: 'Por favor, informe a URL do seu projeto Supabase.', cleanUrl, cleanKey };
    }

    if (rawUrl.trim().startsWith('postgresql://') || rawUrl.trim().startsWith('postgres://')) {
        return {
            success: false,
            message: 'Erro: Você colou a string de conexão direta do PostgreSQL. Cole a URL da API HTTPS (ex: https://xxxx.supabase.co) encontrada em Project Settings > API.',
            cleanUrl,
            cleanKey
        };
    }

    if (!cleanKey) {
        return { success: false, message: 'Por favor, informe a Chave de API "anon public".', cleanUrl, cleanKey };
    }

    if (cleanKey.startsWith('sbp_')) {
        return {
            success: false,
            message: 'Atenção: A chave "sbp_..." é um token da CLI do Supabase. Use a chave "anon public" (iniciada em eyJ...) encontrada em Project Settings > API.',
            cleanUrl,
            cleanKey
        };
    }

    if (cleanKey.length < 20) {
        return { success: false, message: 'Chave de API muito curta. Copie a chave "anon public" completa.', cleanUrl, cleanKey };
    }

    try {
        const tempClient = createClient(cleanUrl, cleanKey);
        const { error } = await tempClient.from('users').select('id').limit(1);

        if (error) {
            // Tabela "users" não existe ou caminho inválido no Supabase do usuário -> Conexão OK, precisa rodar o script SQL de Setup
            if (error.code === '42P01' || error.code === 'PGRST125' || error.message?.includes('does not exist') || error.message?.includes('Invalid path')) {
                return {
                    success: true,
                    needsSetup: true,
                    message: 'Conectado com sucesso! As tabelas do aplicativo ainda precisam ser criadas no Supabase (vá em Setup).',
                    cleanUrl,
                    cleanKey
                };
            }
            // Permissão RLS ou Policy -> Conexão OK
            if (error.code === '42501' || error.message?.includes('permission denied')) {
                return {
                    success: true,
                    needsSetup: true,
                    message: 'Conectado! Execute o script de Permissões (Setup) no Supabase.',
                    cleanUrl,
                    cleanKey
                };
            }
            // Chave Inválida / JWT Expirado
            if (error.code === 'PGRST301' || error.code === '401' || error.message?.includes('JWT') || error.message?.includes('apiKey')) {
                return {
                    success: false,
                    message: 'Chave de API (anon key) inválida ou incorreta. Verifique no Supabase em Project Settings > API.',
                    cleanUrl,
                    cleanKey
                };
            }
            // Erro de Rede / URL inacessível
            if (error.message?.includes('Failed to fetch') || error.message?.includes('FetchError') || error.message?.includes('NetworkError')) {
                return {
                    success: false,
                    message: 'Erro de rede: Não foi possível alcançar o servidor Supabase nesta URL. Verifique se a URL do projeto está correta.',
                    cleanUrl,
                    cleanKey
                };
            }
            // Outro aviso da API -> Se o Supabase respondeu, as credenciais estão certas!
            return {
                success: true,
                needsSetup: false,
                message: `Conectado ao Supabase! (${error.message || 'Pronto para uso'})`,
                cleanUrl,
                cleanKey
            };
        }

        return {
            success: true,
            needsSetup: false,
            message: 'Conexão realizada com sucesso! O banco Supabase está ativo.',
            cleanUrl,
            cleanKey
        };

    } catch (err: any) {
        console.error('[Supabase Test Error]', err);
        return {
            success: false,
            message: err.message || 'Falha na conexão de rede. Verifique a URL e se a internet está ativa.',
            cleanUrl,
            cleanKey
        };
    }
};

// CLIENTE SUPABASE PRINCIPAL
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


