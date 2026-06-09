import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { MainHubDashboard } from './components/MainHubDashboard';
import { ScreenplayEditor } from './components/ScreenplayEditor';
import type { UserThemeSetting } from './components/UserSettingsPanel';
import { setLastDocumentId } from './utils/screenplay-storage';

const themeStorageKey = 'dastan.theme';

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

function HubPage() {
	const navigate = useNavigate();
	const { projectId } = useParams();
	const [theme, setTheme] = useState<UserThemeSetting>(() => getStoredTheme());
	const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => getSystemTheme());

	const resolvedTheme = useMemo(() => {
		if (theme === 'system') {
			return systemTheme;
		}

		return theme;
	}, [systemTheme, theme]);

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
		window.localStorage.setItem(themeStorageKey, theme);
	}, [theme]);

	const handleOpenDocument = useCallback(
		async (id: string) => {
			await setLastDocumentId(id);
			navigate(`/script/${id}`);
		},
		[navigate],
	);

	return (
		<MainHubDashboard
			initialProjectId={projectId ?? null}
			theme={theme}
			resolvedTheme={resolvedTheme}
			onThemeChange={setTheme}
			onOpenDocument={(id) => void handleOpenDocument(id)}
		/>
	);
}

function EditorPage() {
	const navigate = useNavigate();
	const { documentId } = useParams();
	const [theme, setTheme] = useState<UserThemeSetting>(() => getStoredTheme());
	const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => getSystemTheme());

	const resolvedTheme = useMemo(() => {
		if (theme === 'system') {
			return systemTheme;
		}

		return theme;
	}, [systemTheme, theme]);

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
		window.localStorage.setItem(themeStorageKey, theme);
	}, [theme]);

	if (!documentId) {
		return <Navigate to="/" replace />;
	}

	return (
		<ScreenplayEditor
			documentId={documentId}
			theme={theme}
			resolvedTheme={resolvedTheme}
			onThemeChange={setTheme}
			onBackToHub={() => navigate('/')}
		/>
	);
}

export default function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<HubPage />} />
				<Route path="/project/:projectId" element={<HubPage />} />
				<Route path="/script/:documentId" element={<EditorPage />} />
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</BrowserRouter>
	);
}
