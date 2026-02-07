
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Modal } from '../components/ui';
import { authService } from '../services/mockSupabase';
import { isSupabaseConfigured, configureSupabase, clearSupabaseConfig, supabase } from '../services/supabaseClient';
import { ROUTES } from '../constants';
import { User, Lock, Database, CheckCircle, AlertTriangle, ExternalLink, Settings } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Config Modal State
  const [showConfig, setShowConfig] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Pre-fill URL based on current configuration or default
  useEffect(() => {
    if (showConfig) {
        // Try to get from storage first, otherwise use the active client URL (which might be the hardcoded one)
        const storedUrl = localStorage.getItem('cla_supabase_url');
        const storedKey = localStorage.getItem('cla_supabase_key');
        
        // Extract URL from current supabase instance if storage is empty
        // @ts-ignore
        const currentUrl = supabase.supabaseUrl;
        // @ts-ignore
        const currentKey = supabase.supabaseKey;

        setApiUrl(storedUrl || currentUrl || 'https://taubsuolhawpdibrhtkb.supabase.co');
        setApiKey(storedKey || currentKey || '');
        
        setTestStatus('idle');
        setTestMessage('');
    }
  }, [showConfig]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { user, error: authError } = await authService.login(email, password);
      if (authError) {
        setError(authError);
        // Se o erro for de conexão/URL, sugere abrir config
        if (authError.includes('conexão') || authError.includes('fetch') || authError.includes('URL')) {
            setTimeout(() => setShowConfig(true), 1500);
        }
      } else if (user) {
        navigate(ROUTES.DASHBOARD);
      }
    } catch (err) {
      setError('Erro crítico ao tentar logar.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    // 1. Basic Validation
    if (!apiUrl) {
        setTestStatus('error');
        setTestMessage("Informe a URL do projeto.");
        return;
    }
    if (!apiKey) {
      setTestStatus('error');
      setTestMessage("Informe a Chave de API.");
      return;
    }
    
    // 2. Sanitization
    const cleanUrl = apiUrl.trim();
    const cleanKey = apiKey.trim();

    // ERROR TRAP: User pasted PostgreSQL string instead of HTTP URL
    if (cleanUrl.startsWith('postgresql://') || cleanUrl.startsWith('postgres://')) {
        setTestStatus('error');
        setTestMessage("Erro: Use a URL da API (https://...), não a do Banco.");
        return;
    }

    if (!cleanUrl.startsWith('https://')) {
        setTestStatus('error');
        setTestMessage("A URL deve começar com https://");
        return;
    }

    // 3. Connection Test
    setTestStatus('testing');
    setTestMessage("Testando conexão...");

    try {
        // Create a temporary client just to test credentials
        const tempClient = createClient(cleanUrl, cleanKey);
        
        // Try a very simple query. Even if table doesn't exist, Supabase returns specific errors
        // that prove connection was successful (vs network error).
        const { error } = await tempClient.from('users').select('count', { count: 'exact', head: true });

        // Analyze Error
        if (error) {
            // These errors mean we CONNECTED, but maybe tables are missing (which is fine, Setup fixes it)
            const isTableMissing = error.code === '42P01' || error.message.includes('does not exist');
            const isAuthError = error.code === 'PGRST301' || error.message.includes('JWT') || error.code === '401';
            
            if (isTableMissing) {
                 // Success! Connected, but DB needs setup
                 configureSupabase(cleanKey, cleanUrl);
                 return;
            }
            
            if (isAuthError) {
                throw new Error("Chave de API inválida (Use a 'anon public').");
            }
            
            // Other errors (like network)
            if (error.message && (error.message.includes('FetchError') || error.message.includes('Failed to fetch'))) {
                throw new Error("Erro de Rede: Verifique a URL.");
            }
            
            console.warn("Connection warning:", error);
        }

        // If no error, or acceptable error, save!
        setTestStatus('success');
        setTestMessage("Conectado! Reiniciando...");
        
        setTimeout(() => {
            configureSupabase(cleanKey, cleanUrl);
        }, 1000);

    } catch (err: any) {
        console.error(err);
        setTestStatus('error');
        setTestMessage(err.message || "Falha ao conectar. Verifique URL e Chave.");
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-50 dark:bg-[#121212] justify-center items-center p-6 relative overflow-hidden transition-colors duration-500">
      
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[#FF7A00] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-10 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-600 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-10 animate-pulse"></div>

      <div className="w-full max-w-sm z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-white shadow-2xl border border-gray-200 dark:border-white/5 mb-4">
             <User size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Acesso ao Sistema</h1>
          <p className="text-gray-500 text-sm mt-1">Entre com suas credenciais de usuário</p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-xl backdrop-blur-sm transition-colors duration-300">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-4">
              <Input 
                type="email" 
                placeholder="nome@exemplo.com" 
                label="E-mail do Usuário"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-gray-50 dark:bg-[#121212] border-gray-200 dark:border-white/10 focus:border-[#FF7A00]"
              />
              <Input 
                type="password" 
                placeholder="••••••" 
                label="Senha de Acesso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-gray-50 dark:bg-[#121212] border-gray-200 dark:border-white/10 focus:border-[#FF7A00]"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-center font-medium">
                {error}
              </div>
            )}

            <Button type="submit" fullWidth isLoading={loading} className="py-4 shadow-orange-900/20">
              Entrar no Sistema
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5 flex flex-col gap-3 text-center">
             <button 
               type="button" 
               onClick={() => navigate(ROUTES.REGISTER)}
               className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
             >
              Não possui conta? <span className="text-[#FF7A00] font-bold">Cadastrar Usuário</span>
            </button>
          </div>
        </div>

        {/* Technical Footer */}
        <div className="mt-8 text-center space-y-3">
          <div className="flex justify-center items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-green-500 animate-pulse' : 'bg-orange-500'}`}></div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                  {isSupabaseConfigured ? 'Banco de Dados Conectado' : 'Modo Offline (Local)'}
                </p>
          </div>
          
          <div className="flex gap-4 justify-center items-center">
               <button 
                 onClick={() => setShowConfig(true)}
                 className="text-[10px] bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-1.5 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
               >
                 <Settings size={10} />
                 {isSupabaseConfigured ? 'Editar Conexão' : 'Configurar'}
               </button>
               
               {isSupabaseConfigured && (
                   <button 
                     onClick={() => navigate(ROUTES.SETUP)}
                     className="text-[10px] text-gray-500 hover:text-[#FF7A00] transition-colors"
                   >
                     Setup & Correções
                   </button>
               )}
          </div>
        </div>
      </div>

      {/* Configuration Modal */}
      <Modal isOpen={showConfig} onClose={() => setShowConfig(false)} title="Conectar Supabase">
         <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 text-xs text-blue-600 dark:text-blue-300">
               <p className="mb-2">Para conectar, você precisa da <strong>URL</strong> e da <strong>Chave Pública (anon)</strong>.</p>
               <a 
                 href="https://supabase.com/dashboard/project/taubsuolhawpdibrhtkb/settings/api" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="flex items-center gap-1 text-[#FF7A00] font-bold underline hover:text-[#E66E00] transition-colors"
               >
                 Pegar Chave no Supabase <ExternalLink size={12} />
               </a>
            </div>
            
            <Input 
               label="URL do Projeto (API)"
               placeholder="https://taubsuolhawpdibrhtkb.supabase.co"
               value={apiUrl}
               onChange={(e) => setApiUrl(e.target.value)}
            />

            <Input 
               label="Chave Pública (anon public)"
               placeholder="eyJh..."
               value={apiKey}
               onChange={(e) => setApiKey(e.target.value)}
            />
            
            {testStatus !== 'idle' && (
                <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${
                    testStatus === 'error' ? 'bg-red-100 text-red-600' : 
                    testStatus === 'success' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                }`}>
                    {testStatus === 'testing' && <span className="animate-spin">⌛</span>}
                    {testStatus === 'success' && <CheckCircle size={14} />}
                    {testStatus === 'error' && <AlertTriangle size={14} />}
                    {testMessage}
                </div>
            )}

            <Button fullWidth onClick={handleSaveConfig} isLoading={testStatus === 'testing'}>
               Testar Conexão e Salvar
            </Button>
            
            {/* Fallback info */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                <p className="text-xs text-center text-gray-500 mb-2">Se não conseguir conectar, use o modo local:</p>
                <div className="flex justify-center gap-2">
                   <button onClick={clearSupabaseConfig} className="text-xs text-red-500 underline">Voltar para Offline</button>
                </div>
            </div>
         </div>
      </Modal>
    </div>
  );
};

export default Login;
