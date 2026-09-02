
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Modal } from '../components/ui';
import { authService } from '../services/mockSupabase';
import { isSupabaseConfigured, configureSupabase, clearSupabaseConfig, testSupabaseConnection } from '../services/supabaseClient';
import { ROUTES } from '../constants';
import { User, Lock, CheckCircle, AlertTriangle, ExternalLink, Settings, Wifi, WifiOff, Handshake } from 'lucide-react';
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
        // Try to get from storage first, otherwise use the active client URL
        const storedUrl = localStorage.getItem('cla_supabase_url');
        const storedKey = localStorage.getItem('cla_supabase_key');
        
        // Extract URL from current supabase instance
        // @ts-ignore
        const currentUrl = supabase.supabaseUrl;
        
        // Only autofill if it's not the placeholder
        const effectiveUrl = currentUrl && !currentUrl.includes('placeholder') ? currentUrl : 'https://taubsuolhawpdibrhtkb.supabase.co';

        setApiUrl(storedUrl || effectiveUrl);
        setApiKey(storedKey || '');
        
        setTestStatus('idle');
        setTestMessage('');
    }
  }, [showConfig]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const targetEmail = email.trim();
    const targetPass = password.trim();

    if (!targetEmail) {
      setError('Por favor, informe seu e-mail.');
      setLoading(false);
      return;
    }
    if (!targetPass) {
      setError('Por favor, informe sua senha.');
      setLoading(false);
      return;
    }

    try {
      const { user, error: authError } = await authService.login(targetEmail, targetPass);
      if (authError) {
        setError(authError);
        if ((authError.includes('conexão') || authError.includes('fetch')) && !isSupabaseConfigured) {
            setTimeout(() => setShowConfig(true), 1500);
        }
      } else if (user) {
        navigate(ROUTES.DASHBOARD);
      }
    } catch (err) {
      setError('Erro ao tentar logar.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const targetEmail = email.trim() || 'admin@cla.com';
      const targetPass = password || '123456';
      const { user, error: authError } = await authService.login(targetEmail, targetPass);
      if (user) {
        navigate(ROUTES.DASHBOARD);
      } else if (authError) {
        setError(authError);
      }
    } catch (err) {
      setError('Erro ao acessar o sistema.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setTestStatus('testing');
    setTestMessage("Testando conexão com o Supabase...");

    const res = await testSupabaseConnection(apiUrl, apiKey);

    if (res.success) {
      setTestStatus('success');
      setTestMessage(res.message);
      
      setTimeout(() => {
        configureSupabase(res.cleanKey, res.cleanUrl);
      }, 1200);
    } else {
      setTestStatus('error');
      setTestMessage(res.message);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-50 dark:bg-[#121212] justify-center items-center p-6 relative overflow-hidden transition-colors duration-500">
      
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-brand-primary rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-10 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-600 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-10 animate-pulse"></div>

      <div className="w-full max-w-sm z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-white to-gray-100 dark:from-[#1E1E1E] dark:to-[#252525] text-brand-primary shadow-[0_8px_30px_rgba(255,122,0,0.15)] border-4 border-brand-primary mb-4 relative overflow-hidden group">
             {/* Logo Placeholder (Native Look) */}
             <div className="absolute inset-0 bg-brand-primary/5 flex items-center justify-center">
                <Handshake size={56} className="text-gray-900 dark:text-white drop-shadow-sm" strokeWidth={1.5} />
             </div>
             
             {/* Se quiser usar a imagem exata, descomente abaixo e salve o arquivo na pasta public */}
             {/* <img src="/logo.png" alt="CLA Vendas" className="absolute inset-0 w-full h-full object-cover" /> */}
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">CLA VENDAS</h1>
          <p className="text-gray-500 font-medium text-sm mt-1">Gestão de Vendas & Caixa</p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-xl backdrop-blur-sm transition-colors duration-300">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-4">
              <Input 
                type="email" 
                placeholder="nome@exemplo.com" 
                label="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-gray-50 dark:bg-[#121212] border-gray-200 dark:border-white/10 focus:border-brand-primary"
              />
              <Input 
                type="password" 
                placeholder="••••••" 
                label="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-gray-50 dark:bg-[#121212] border-gray-200 dark:border-white/10 focus:border-brand-primary"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-center font-medium">
                {error}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <Button type="submit" fullWidth isLoading={loading} className="py-3.5 shadow-brand-primary/20">
                Entrar no Sistema
              </Button>
              
              <button
                type="button"
                onClick={handleQuickLogin}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold border border-brand-primary/30 text-brand-primary hover:bg-brand-primary/5 dark:hover:bg-brand-primary/10 transition-colors flex items-center justify-center gap-2"
              >
                <span>🚀 Acesso Rápido Instantâneo</span>
              </button>
            </div>
          </form>

          <div className="mt-5 pt-5 border-t border-gray-100 dark:border-white/5 flex flex-col gap-3 text-center">
             <button 
               type="button" 
               onClick={() => navigate(ROUTES.REGISTER)}
               className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
             >
              Primeiro acesso? <span className="text-brand-primary font-bold">Criar Conta</span>
            </button>
          </div>
        </div>

        {/* Connection Status Footer */}
        <div className="mt-6 text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border bg-green-500/10 text-green-600 border-green-500/20">
                <Wifi size={12} className="text-green-500" />
                {isSupabaseConfigured ? 'Conectado ao Supabase (Nuvem)' : 'Banco Integrado Ativo (Zero Configuração)'}
          </div>
          
          <div className="flex gap-4 justify-center items-center">
               <button 
                 onClick={() => setShowConfig(true)}
                 className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1.5"
               >
                 <Settings size={10} />
                 {isSupabaseConfigured ? 'Alterar Supabase' : 'Conectar Supabase em Nuvem (Opcional)'}
               </button>
               
               {isSupabaseConfigured && (
                   <button 
                     onClick={() => navigate(ROUTES.SETUP)}
                     className="text-[10px] text-gray-400 hover:text-brand-primary transition-colors"
                   >
                     Reparar Banco
                   </button>
               )}
          </div>
        </div>
      </div>

      {/* Configuration Modal */}
      <Modal isOpen={showConfig} onClose={() => setShowConfig(false)} title="Conectar Supabase">
         <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 text-xs text-blue-600 dark:text-blue-300">
               <p className="mb-1 font-bold">Onde encontrar suas chaves no Supabase:</p>
               <p className="mb-2">Acesse seu projeto no Supabase &gt; <strong>Project Settings</strong> &gt; <strong>API</strong>. Copie a <strong>Project URL</strong> e a chave <strong>anon public</strong>.</p>
               <a 
                 href="https://supabase.com/dashboard" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="inline-flex items-center gap-1 text-brand-primary font-bold underline hover:text-brand-primary/90 transition-colors"
               >
                 Abrir Supabase Dashboard <ExternalLink size={12} />
               </a>
            </div>
            
            <Input 
               label="URL do Projeto"
               value={apiUrl}
               onChange={(e) => setApiUrl(e.target.value)}
            />

            <Input 
               label="Chave Pública (Anon)"
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
               Salvar Conexão
            </Button>
            
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10 flex justify-center">
                <button onClick={clearSupabaseConfig} className="text-xs text-red-500 underline hover:text-red-600">
                    Resetar para Offline
                </button>
            </div>
         </div>
      </Modal>
    </div>
  );
};

export default Login;
