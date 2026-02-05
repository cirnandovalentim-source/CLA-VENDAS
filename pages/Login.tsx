
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Modal } from '../components/ui';
import { authService } from '../services/mockSupabase';
import { isSupabaseConfigured, configureSupabase, clearSupabaseConfig } from '../services/supabaseClient';
import { ROUTES, ICONS } from '../constants';
import { User, Lock } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Config Modal State
  const [showConfig, setShowConfig] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { user, error: authError } = await authService.login(email, password);
      if (authError) {
        setError(authError);
      } else if (user) {
        navigate(ROUTES.DASHBOARD);
      }
    } catch (err) {
      setError('Erro ao conectar ao servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = () => {
    if (apiKey.length < 20) {
      alert("Chave inválida. Certifique-se de copiar a chave 'anon' / 'public' completa.");
      return;
    }
    configureSupabase(apiKey);
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
            <button type="button" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              Esqueci minha senha
            </button>
          </div>
        </div>

        {/* Technical Footer */}
        <div className="mt-8 text-center space-y-2">
          <div className="flex justify-center items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                  {isSupabaseConfigured ? 'Servidor Conectado' : 'Modo Local'}
                </p>
          </div>
          
          {!isSupabaseConfigured && (
              <button 
                onClick={() => setShowConfig(true)}
                className="text-[10px] text-gray-500 underline hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Configurações do Servidor
              </button>
          )}

          {isSupabaseConfigured && (
              <div className="flex gap-4 justify-center">
               <button 
                 onClick={() => navigate(ROUTES.SETUP)}
                 className="text-[10px] text-gray-500 hover:text-[#FF7A00] transition-colors"
               >
                 Setup & Correções
               </button>
               <button 
                 onClick={clearSupabaseConfig}
                 className="text-[10px] text-gray-500 hover:text-red-500 transition-colors"
               >
                 Desconectar
               </button>
              </div>
          )}
        </div>
      </div>

      {/* Configuration Modal */}
      <Modal isOpen={showConfig} onClose={() => setShowConfig(false)} title="Configurar Conexão">
         <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
               Configuração técnica de conexão com banco de dados Supabase.
            </p>
            <div className="bg-gray-100 dark:bg-black/30 p-2 rounded text-xs font-mono text-gray-500 break-all">
               Host: taubsuolhawpdibrhtkb.supabase.co
            </div>
            <Input 
               label="Chave de API (Public)"
               placeholder="eyJh..."
               value={apiKey}
               onChange={(e) => setApiKey(e.target.value)}
            />
            <Button fullWidth onClick={handleSaveConfig}>
               Salvar Conexão
            </Button>
            
            {!isSupabaseConfigured && (
               <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                 <p className="text-xs text-center text-gray-500 mb-2">Login Padrão (Local)</p>
                 <div className="flex justify-center gap-2">
                    <span className="bg-gray-100 dark:bg-white/5 px-2 py-1 rounded text-xs text-gray-500">admin@cla.com</span>
                    <span className="bg-gray-100 dark:bg-white/5 px-2 py-1 rounded text-xs text-gray-500">123456</span>
                 </div>
               </div>
            )}
         </div>
      </Modal>
    </div>
  );
};

export default Login;
