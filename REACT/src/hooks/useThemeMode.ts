import { useEffect, useState } from 'react';

const THEME_KEY = 'estate-theme-v2';

export function useThemeMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = window.localStorage.getItem(THEME_KEY);
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    window.localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  }, [dark]);

  return {
    dark,
    toggleTheme: () => setDark((value) => !value),
  };
}
