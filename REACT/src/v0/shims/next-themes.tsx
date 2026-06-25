import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  resolvedTheme: 'dark',
  setTheme: () => undefined,
});

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
}: {
  children: ReactNode;
  defaultTheme?: Theme;
  attribute?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  useEffect(() => {
    const resolved = theme === 'system' ? 'dark' : theme;
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme: theme === 'light' ? 'light' : 'dark', setTheme }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export type ThemeProviderProps = Parameters<typeof ThemeProvider>[0];
