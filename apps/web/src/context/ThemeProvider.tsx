import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { UserThemeSetting } from '../components/UserSettingsPanel';

const themeStorageKey = 'dastan.theme';

interface ThemeContextValue {
	theme: UserThemeSetting;
	resolvedTheme: 'light' | 'dark';
	setTheme: (theme: UserThemeSetting) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getStoredTheme(): UserThemeSetting {
	if (typeof window === 'undefined') {
		return 'system';
	}

	const rawValue = window.localStorage.getItem(themeStorageKey);

	if (rawValue === 'light' || rawValue === 'dark' || rawValue === 'system') {
		return rawValue;
	}

	return 'system';
}

function getSystemTheme(): 'light' | 'dark' {
	if (typeof window === 'undefined') {
		return 'light';
	}

	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setThemeState] = useState<UserThemeSetting>(() => getStoredTheme());
	const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => getSystemTheme());

	const resolvedTheme = useMemo(() => {
		if (theme === 'system') {
			return systemTheme;
		}

		return theme;
	}, [systemTheme, theme]);

	const setTheme = useCallback((nextTheme: UserThemeSetting) => {
		setThemeState(nextTheme);
		window.localStorage.setItem(themeStorageKey, nextTheme);
	}, []);

	useEffect(() => {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

		const handleChange = () => {
			setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
		};

		mediaQuery.addEventListener('change', handleChange);
		return () => {
			mediaQuery.removeEventListener('change', handleChange);
		};
	}, []);

	useEffect(() => {
		document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
	}, [resolvedTheme]);

	return (
		<ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme(): ThemeContextValue {
	const context = useContext(ThemeContext);

	if (!context) {
		throw new Error('useTheme must be used within ThemeProvider');
	}

	return context;
}
