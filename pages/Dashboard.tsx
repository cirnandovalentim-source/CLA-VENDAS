
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS, ROUTES } from '../constants';
import { Card } from '../components/ui';
import { dataService, authService } from '../services/mockSupabase';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = authService.getSession();
  const [stats, setStats] = useState({
    totalVendido: 0,
    totalRecebido: 0,
    totalReceber: 0,
    inadimplencia: 0
  });
  
  const [valuesVisible, setValuesVisible] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      const data = await dataService.getDashboardStats();
      setStats(data);
    };
    loadStats();
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    navigate(ROUTES.LOGIN);
  };

  const formatCurrency = (val: number) => {
    if (!valuesVisible) return '••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Logic to show notification only if there is overdue debt
  const hasNotifications = stats.inadimplencia > 0;

  return (
    <div className="animate-fade-in relative bg-[#F3F4F6] dark:bg-[#121212] min-h-screen pb-24">
      
      {/* 1. TOP HEADER (Blue/Orange Background) - Overlapping style */}
      <div className="bg-[#FF7A00] pt-12 pb-24 px-6 rounded-b-[40px] shadow-lg relative z-0">
        <div className="flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold border border-white/30">
                {user?.nome?.charAt(0) || 'U'}
             </div>
             <div>
                <p className="text-orange-100 text-xs font-medium">Bem-vindo,</p>
                <h1 className="text-xl font-bold leading-tight">{user?.nome?.split(' ')[0] || 'Usuário'}!</h1>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setValuesVisible(!valuesVisible)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                {valuesVisible ? ICONS.Eye : ICONS.EyeOff}
             </button>
             
             {/* Notification Bell - Fixed Logic */}
             <button 
                onClick={() => navigate(ROUTES.PAYMENTS)} 
                className="p-2 rounded-full hover:bg-white/10 transition-colors relative"
             >
                {ICONS.Alert}
                {hasNotifications && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#FF7A00]"></span>
                )}
             </button>

             <button onClick={handleLogout} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                {ICONS.Logout}
             </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN CARD (Floating) - Like the "TUBARÃO" card in screenshot */}
      <div className="px-5 -mt-16 relative z-10">
         <div className="bg-white dark:bg-[#1E1E1E] rounded-[28px] p-6 shadow-xl border border-white/50 dark:border-[#333]">
            <div className="flex justify-between items-start mb-6">
               <div className="flex flex-col">
                  <span className="text-gray-900 dark:text-white font-black text-lg tracking-wide uppercase">VENDAS</span>
                  <span className="text-xs text-gray-400 font-medium">Resumo Mensal</span>
               </div>
               <span className="text-gray-900 dark:text-white font-bold italic opacity-30 text-xl">CLA</span>
            </div>

            <div className="flex justify-between items-end">
               <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs font-bold mb-1">TOTAL VENDIDO</p>
                  <h2 className="text-3xl font-black text-[#0038A8] dark:text-[#FF7A00] tracking-tight">
                     {formatCurrency(stats.totalVendido)}
                  </h2>
               </div>
               <div className="text-right">
                   <p className="text-gray-400 text-[10px] font-bold uppercase mb-0.5">Disponível / Receber</p>
                   <p className="text-gray-900 dark:text-white font-bold text-lg">
                      {formatCurrency(stats.totalReceber)}
                   </p>
               </div>
            </div>

            {/* Progress Bar Visual */}
            <div className="mt-5 w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
               <div className="h-full bg-[#0038A8] dark:bg-[#FF7A00]" style={{ width: '70%' }}></div>
               <div className="h-full bg-gray-300 dark:bg-gray-600" style={{ width: '30%' }}></div>
            </div>

            {/* Card Buttons */}
            <div className="flex gap-3 mt-6">
               <button 
                  onClick={() => navigate(ROUTES.NEW_SALE)}
                  className="flex-1 bg-[#F0F4FF] dark:bg-[#FF7A00]/10 text-[#0038A8] dark:text-[#FF7A00] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#E0Eaff] transition-colors"
               >
                  {ICONS.Add} Nova Venda
               </button>
               <button 
                  onClick={() => navigate(ROUTES.REPORTS)}
                  className="flex-1 bg-gray-50 dark:bg-[#2A2A2A] text-gray-700 dark:text-gray-300 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
               >
                  ... Relatórios
               </button>
            </div>
         </div>
      </div>

      {/* 3. SECONDARY CARD (Saldo/Actions) - Like "Saldo na conta" */}
      <div className="px-5 mt-4">
         <div className="bg-white dark:bg-[#1E1E1E] rounded-[24px] p-5 shadow-sm border border-gray-100 dark:border-[#333]">
             <div className="flex justify-between items-baseline mb-4">
                <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Recebido (Caixa)</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                   {formatCurrency(stats.totalRecebido)}
                   <span className="text-xs text-gray-400 font-normal ml-1">hoje</span>
                </span>
             </div>

             {/* Action Grid */}
             <div className="grid grid-cols-2 gap-3">
                <button 
                   onClick={() => navigate(ROUTES.PAYMENTS)}
                   className="bg-[#0038A8] dark:bg-[#FF7A00] text-white py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/10"
                >
                   {ICONS.Payments} Receber / Caixa
                </button>
                <button 
                   onClick={() => navigate(ROUTES.CLIENTS)}
                   className="bg-white border border-gray-200 dark:bg-[#2A2A2A] dark:border-[#333] text-gray-700 dark:text-gray-200 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                >
                   {ICONS.Clients} Clientes
                </button>
                
                {/* Extra buttons for Admin */}
                {user?.perfil === 'admin' && (
                  <>
                     <button 
                        onClick={() => navigate(ROUTES.PRODUCTS)}
                        className="bg-gray-50 dark:bg-[#252525] text-gray-600 dark:text-gray-400 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                     >
                        {ICONS.Product} Produtos
                     </button>
                     <button 
                        onClick={() => navigate(ROUTES.SETTINGS)}
                        className="bg-gray-50 dark:bg-[#252525] text-gray-600 dark:text-gray-400 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                     >
                        {ICONS.Settings} Ajustes
                     </button>
                  </>
                )}
             </div>
         </div>
      </div>

      {/* 4. MARKETING BANNER - "Não deixe nada para depois" style */}
      <div className="px-5 mt-6">
         <div className="bg-gradient-to-r from-[#0038A8] to-[#0055FF] dark:from-[#FF7A00] dark:to-[#FF9E00] rounded-[24px] p-6 text-white relative overflow-hidden shadow-lg">
            <div className="relative z-10 w-2/3">
               <h3 className="text-lg font-black leading-tight mb-2">Bata sua meta hoje mesmo!</h3>
               <p className="text-blue-100 dark:text-orange-100 text-xs font-medium mb-4">
                  Registre suas vendas e acompanhe o crescimento do seu negócio em tempo real.
               </p>
               <button 
                  onClick={() => navigate(ROUTES.NEW_SALE)}
                  className="bg-white text-[#0038A8] dark:text-[#FF7A00] px-4 py-2 rounded-full text-xs font-bold shadow-sm"
               >
                  Vender Agora
               </button>
            </div>
            {/* Decorative Element mimicking the image in screenshot */}
            <div className="absolute -right-6 bottom-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute right-2 bottom-[-10px] text-white/20">
               <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            </div>
         </div>
      </div>

      {/* 5. LIST HEADER "Ofertas pra você" -> "Atalhos" */}
      <div className="px-5 mt-6 mb-2">
         <h3 className="font-bold text-gray-900 dark:text-white text-base">Acesso Rápido</h3>
      </div>
      
      <div className="px-5 pb-6">
         <div className="bg-white dark:bg-[#1E1E1E] rounded-[20px] p-4 flex items-center justify-between border border-gray-100 dark:border-[#333] shadow-sm cursor-pointer" onClick={() => navigate(ROUTES.SETTINGS)}>
            <div className="flex items-center gap-3">
               <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
               </div>
               <div>
                  <p className="font-bold text-sm text-gray-900 dark:text-white">Segurança de Dados</p>
                  <p className="text-xs text-gray-500">Backup e proteção</p>
               </div>
            </div>
            <div className="text-gray-400">{ICONS.Right}</div>
         </div>
      </div>

    </div>
  );
};

export default Dashboard;
