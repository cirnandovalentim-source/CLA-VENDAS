
import React from 'react';

// --- BUTTON ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  fullWidth?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', fullWidth, isLoading, icon, className, ...props 
}) => {
  // Increased rounded-xl to rounded-2xl for friendlier UI
  const baseStyles = "relative flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100";
  
  const variants = {
    primary: "bg-[#FF7A00] text-white hover:bg-[#E66E00] shadow-lg shadow-orange-500/30 border border-transparent",
    
    // Secondary is now cleaner, lighter gray
    secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-[#333] dark:text-gray-100 dark:hover:bg-[#404040] border border-transparent",
    
    outline: "border-2 border-[#FF7A00] text-[#FF7A00] hover:bg-[#FF7A00]/10",
    
    ghost: "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/5",
    
    danger: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
};

// --- INPUT ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">{label}</label>}
      <input 
        className={`w-full bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-2xl px-4 py-4 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#FF7A00] focus:ring-2 focus:ring-[#FF7A00]/20 transition-all disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-[#121212] font-medium ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-500 dark:text-red-400 ml-1 font-bold">{error}</span>}
    </div>
  );
};

// --- CARD ---
export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className, onClick }) => {
  return (
    <div 
      onClick={onClick}
      // Increased rounded-2xl to rounded-3xl for the main banking cards look
      // Added shadow-md for better pop
      className={`bg-white dark:bg-[#1E1E1E] rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-[#333] ${onClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

// --- BADGE ---
export const Badge: React.FC<{ status: 'ABERTA' | 'PARCIAL' | 'QUITADA' | string }> = ({ status }) => {
  const styles: Record<string, string> = {
    'ABERTA': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-100 dark:border-blue-800',
    'PARCIAL': 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-100 dark:border-orange-800',
    'QUITADA': 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-100 dark:border-green-800',
    'DEVOLVIDO': 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-100 dark:border-red-800',
    'ENTRADA': 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    'SAIDA': 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
  };

  const defaultStyle = 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold border border-transparent tracking-wide ${styles[status] || defaultStyle}`}>
      {status}
    </span>
  );
};

// --- MODAL ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-md rounded-[32px] border border-gray-100 dark:border-[#333] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-[#333]">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-2 bg-gray-50 dark:bg-[#333] rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#404040]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar text-gray-800 dark:text-gray-200">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- TOAST ---
export const Toast: React.FC<{ message: string; isVisible: boolean; onClose: () => void }> = ({ message, isVisible, onClose }) => {
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[60] animate-[slide-down_0.3s_ease-out]">
      <div className="bg-gray-900/95 dark:bg-white/95 backdrop-blur-md text-white dark:text-gray-900 px-6 py-3 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center gap-3 border border-white/10 dark:border-black/5">
        <div className="bg-[#10B981] rounded-full p-1 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <span className="font-bold text-sm">{message}</span>
      </div>
    </div>
  );
};
