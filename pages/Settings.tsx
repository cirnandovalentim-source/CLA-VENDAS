
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS, ROUTES } from '../constants';
import { Card, Button, Input } from '../components/ui';
import { dataService, authService } from '../services/mockSupabase';
import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sun, Lock } from 'lucide-react';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  
  // Security State
  const [isVerified, setIsVerified] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // File upload ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Focus password input on mount
  useEffect(() => {
     // Optional: Check if already verified in session storage if we wanted persistence per session
     // For now, we ask every time the component mounts for max security
  }, []);

  const handleVerifyPassword = async (e?: React.FormEvent) => {
      e?.preventDefault();
      setAuthError('');
      setLoading(true);

      const user = authService.getSession();
      if (!user) {
          navigate(ROUTES.LOGIN);
          return;
      }

      // Check password using authService
      const { user: validUser, error } = await authService.login(user.email, passwordInput);

      setLoading(false);
      
      if (validUser) {
          setIsVerified(true);
      } else {
          setAuthError('Senha incorreta.');
      }
  };

  const handleDownloadBackup = async () => {
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const jsonString = await dataService.exportBackupData();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_cla_vendas_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSuccessMsg('Backup baixado com sucesso!');
    } catch (e) {
      console.error(e);
      setErrorMsg('Erro ao gerar backup.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        await dataService.importBackupData(content);
        setSuccessMsg('Dados restaurados com sucesso! O app será recarregado.');
        setTimeout(() => {
           window.location.reload();
        }, 2000);
      } catch (err) {
        console.error(err);
        setErrorMsg('Erro ao restaurar arquivo. Verifique se é um backup válido.');
        setLoading(false);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate(ROUTES.LOGIN);
  };

  // --- LOCKED SCREEN ---
  if (!isVerified) {
      return (
          <div className="flex flex-col h-screen bg-gray-100 dark:bg-[#121212] justify-center items-center p-6">
              <div className="w-full max-w-sm space-y-6">
                  <div className="text-center">
                      <div className="w-16 h-16 bg-gray-200 dark:bg-[#2E2E2E] rounded-full flex items-center justify-center mx-auto mb-4 text-gray-500 dark:text-gray-400">
                          <Lock size={32} />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Área Protegida</h2>
                      <p className="text-sm text-gray-500 mt-2">Confirme sua senha para acessar Ajustes e Backup.</p>
                  </div>

                  <form onSubmit={handleVerifyPassword} className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-[#333] space-y-4">
                      <Input 
                          type="password"
                          label="Sua Senha"
                          placeholder="••••••"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          autoFocus
                      />
                      {authError && <p className="text-red-500 text-xs text-center font-bold">{authError}</p>}
                      
                      <Button fullWidth type="submit" isLoading={loading}>
                          Acessar
                      </Button>
                      
                      <button 
                        type="button"
                        onClick={() => navigate(-1)}
                        className="w-full text-center text-sm text-gray-400 mt-4 hover:text-gray-600"
                      >
                          Voltar
                      </button>
                  </form>
              </div>
          </div>
      );
  }

  // --- UNLOCKED SETTINGS ---
  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-[#1A1A1A] text-gray-900 dark:text-white transition-colors duration-300">
      <div className="bg-white dark:bg-[#2E2E2E] p-4 flex items-center gap-4 border-b border-gray-200 dark:border-white/5 sticky top-0 z-10 transition-colors">
        <button onClick={() => navigate(-1)} className="text-gray-900 dark:text-white">
          {ICONS.Left}
        </button>
        <h1 className="text-lg font-bold">Configurações & Dados</h1>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Appearance Section */}
        <Card className="flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                 {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              </div>
              <div>
                 <h3 className="font-bold text-gray-900 dark:text-white">Aparência</h3>
                 <p className="text-xs text-gray-500">Alternar tema claro/escuro</p>
              </div>
           </div>
           
           <button 
             onClick={toggleTheme}
             className={`w-12 h-6 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-brand-primary' : 'bg-gray-300'}`}
           >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${theme === 'dark' ? 'left-7' : 'left-1'}`}></div>
           </button>
        </Card>
        
        <Card className="space-y-4">
           <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900 dark:text-white">
              {ICONS.Database} Banco de Dados
           </h3>
           <p className="text-sm text-gray-500">Ferramentas de manutenção e correção.</p>
           <Button 
             onClick={() => navigate(ROUTES.SETUP)}
             variant="secondary"
             fullWidth
             className="border border-brand-primary/20 text-brand-primary dark:text-brand-primary/80 bg-brand-primary/5 hover:bg-brand-primary/10"
           >
              Abrir Tela de Setup / Correção
           </Button>
        </Card>

        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-sm text-blue-600 dark:text-blue-200">
           <p className="flex items-center gap-2 mb-2 font-bold text-blue-600 dark:text-blue-400">
              <span className="p-1 bg-blue-500/20 rounded-lg">{ICONS.Alert}</span>
              Importante
           </p>
           Os dados deste aplicativo ficam salvos no armazenamento do seu navegador. 
           Recomendamos fazer o download do backup periodicamente.
        </div>

        <Card className="space-y-4">
           <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900 dark:text-white">
              {ICONS.Database} Backup Local
           </h3>
           <p className="text-gray-500 text-sm">
             Exporte seus dados para um arquivo seguro ou restaure de um arquivo salvo anteriormente.
           </p>

           <div className="grid grid-cols-1 gap-3 pt-2">
              <Button 
                onClick={handleDownloadBackup} 
                disabled={loading}
                icon={ICONS.Download}
                variant="outline"
                fullWidth
              >
                 Baixar Backup (Exportar)
              </Button>

              <Button 
                onClick={handleRestoreClick} 
                disabled={loading}
                icon={ICONS.Upload}
                variant="secondary"
                fullWidth
              >
                 Carregar Backup (Importar)
              </Button>
              <input 
                 type="file" 
                 accept=".json" 
                 ref={fileInputRef}
                 className="hidden"
                 onChange={handleFileChange}
              />
           </div>
        </Card>

        <Card className="space-y-4 border border-red-500/10">
           <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900 dark:text-white">
              {ICONS.Settings} Conta
           </h3>
           <Button 
             onClick={handleLogout} 
             variant="danger"
             icon={ICONS.Logout}
             fullWidth
           >
              Sair do Aplicativo
           </Button>
        </Card>

        {loading && (
           <div className="text-center py-4 text-gray-400 animate-pulse">
              Processando dados...
           </div>
        )}
        
        {successMsg && (
           <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-xl text-center">
              {successMsg}
           </div>
        )}
        
        {errorMsg && (
           <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-center">
              {errorMsg}
           </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
