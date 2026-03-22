
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

export type PrimaryColor = '#FF7A00' | '#3B82F6' | '#10B981' | '#8B5CF6' | '#EC4899' | '#EAB308';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  primaryColor: PrimaryColor;
  setPrimaryColor: (color: PrimaryColor) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  primaryColor: '#FF7A00',
  setPrimaryColor: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : null;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('cla_theme');
    return (saved as Theme) || 'light';
  });

  const [primaryColor, setPrimaryColor] = useState<PrimaryColor>(() => {
    const saved = localStorage.getItem('cla_primary_color');
    return (saved as PrimaryColor) || '#FF7A00';
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
    localStorage.setItem('cla_primary_color', primaryColor);

    // 3. Update CSS Variable for Primary Color
    const rgb = hexToRgb(primaryColor);
    if (rgb) {
      root.style.setProperty('--color-primary', rgb);
    }

    // 4. Update Meta Theme Color (Status Bar / Browser Bar)
    const metaThemeColor = document.querySelector("meta[name='theme-color']");
    if (metaThemeColor) {
        metaThemeColor.setAttribute("content", theme === 'dark' ? '#121212' : primaryColor);
    }

  }, [theme, primaryColor]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, primaryColor, setPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
};
