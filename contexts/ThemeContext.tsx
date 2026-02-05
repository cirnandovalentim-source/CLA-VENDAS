
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('cla_theme');
    return (saved as Theme) || 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    
    // 1. Update HTML Class
    if (theme === 'dark') {
      root.classList.add('dark');
      body.style.backgroundColor = '#121212'; // Deeper black for high contrast
    } else {
      root.classList.remove('dark');
      body.style.backgroundColor = '#F3F4F6'; // Gray-100 for clear separation
    }

    // 2. Save Preference
    localStorage.setItem('cla_theme', theme);

    // 3. Update Meta Theme Color (Status Bar / Browser Bar)
    const metaThemeColor = document.querySelector("meta[name='theme-color']");
    if (metaThemeColor) {
        metaThemeColor.setAttribute("content", theme === 'dark' ? '#121212' : '#FF7A00');
    }

  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
