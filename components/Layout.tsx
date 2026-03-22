
import React from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { ICONS, ROUTES } from '../constants';
import { authService } from '../services/mockSupabase';

const BottomNavItem: React.FC<{ 
  to: string; 
  icon: React.ReactNode; 
  label: string; 
  isActive: boolean 
}> = ({ to, icon, label, isActive }) => {
  const navigate = useNavigate();
  return (
    <button 
      onClick={() => navigate(to)}
      className={`flex flex-col items-center justify-center w-full gap-1.5 transition-all active:scale-95 ${isActive ? 'text-brand-primary' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
    >
      <div className={`transition-all duration-300 p-1 rounded-xl ${isActive ? 'bg-brand-primary/10 -translate-y-1' : ''}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-bold ${isActive ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
    </button>
  );
};

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const session = authService.getSession();

  React.useEffect(() => {
    if (!session) {
      navigate(ROUTES.LOGIN);
    }
  }, [session, navigate]);

  if (!session) return null;

  const currentPath = location.pathname;

  return (
    // Background color set to F3F4F6 (light gray) to match the screenshot app background
    <div className="flex flex-col h-screen w-screen bg-[#F3F4F6] dark:bg-[#121212] overflow-hidden text-gray-900 dark:text-[#E5E5E5] transition-colors duration-300 font-sans">
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 custom-scrollbar">
        <Outlet />
      </main>

      {/* Bottom Navigation - Minimalist White */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1E1E1E] border-t border-gray-100 dark:border-[#333] pb-safe-area-inset-bottom pt-2 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-50 rounded-t-[20px]">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
          <BottomNavItem 
            to={ROUTES.DASHBOARD} 
            icon={ICONS.Dashboard} 
            label="Início" 
            isActive={currentPath === ROUTES.DASHBOARD} 
          />
          <BottomNavItem 
            to={ROUTES.SALES} 
            icon={ICONS.Sales} 
            label="Vendas" 
            isActive={currentPath === ROUTES.SALES} 
          />
          {/* FAB Spacer */}
          <div className="w-16"></div>
          
          <BottomNavItem 
            to={ROUTES.PAYMENTS} 
            icon={ICONS.Payments} 
            label="Caixa" 
            isActive={currentPath === ROUTES.PAYMENTS} 
          />
          <BottomNavItem 
            to={ROUTES.CLIENTS} 
            icon={ICONS.Clients} 
            label="Clientes" 
            isActive={currentPath === ROUTES.CLIENTS} 
          />
        </div>
      </div>

      {/* Floating Action Button (New Sale) - Clean and Raised */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <button 
          onClick={() => navigate(ROUTES.NEW_SALE)}
          className="bg-brand-primary text-white w-14 h-14 rounded-full shadow-[0_8px_20px_rgba(255,122,0,0.4)] hover:bg-brand-primary/90 active:scale-90 transition-all border-[4px] border-[#F3F4F6] dark:border-[#121212] flex items-center justify-center"
        >
          {ICONS.Add}
        </button>
      </div>
    </div>
  );
};

export default Layout;
