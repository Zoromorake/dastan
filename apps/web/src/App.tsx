import { lazy, Suspense, useCallback, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { DastanAppProvider, useDastanApp } from './context/DastanAppProvider';
import { ThemeProvider, useTheme } from './context/ThemeProvider';
import { useScreenplayStore } from './store';
import { getHubPathForDocument } from './utils/navigation';
import { endWritingSession } from './utils/writing-stats';

const MainHubDashboard = lazy(() =>
	import('./components/MainHubDashboard').then((module) => ({ default: module.MainHubDashboard })),
);
const ScreenplayEditor = lazy(() =>
	import('./components/ScreenplayEditor').then((module) => ({ default: module.ScreenplayEditor })),
);

function RouteLoadingFallback() {
	return (
		<div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">
			Loading…
		</div>
	);
}

function HubPage() {
	const navigate = useNavigate();
	const { projectId } = useParams();
	const { theme, resolvedTheme, setTheme } = useTheme();
	const { storage } = useDastanApp();

	const handleOpenDocument = useCallback(
		async (id: string) => {
			await storage.documents.setLastDocumentId(id);
			navigate(`/script/${id}`);
		},
		[navigate, storage],
	);

	const handleNavigateToProject = useCallback(
		(id: string | null) => {
			navigate(id ? `/project/${id}` : '/');
		},
		[navigate],
	);

	return (
		<ErrorBoundary label="hub">
			<Suspense fallback={<RouteLoadingFallback />}>
				<MainHubDashboard
				initialProjectId={projectId ?? null}
				theme={theme}
				resolvedTheme={resolvedTheme}
				onThemeChange={setTheme}
				onNavigateToProject={handleNavigateToProject}
				onOpenDocument={(id) => void handleOpenDocument(id)}
			/>
			</Suspense>
		</ErrorBoundary>
	);
}

function EditorPage() {
	const navigate = useNavigate();
	const { documentId } = useParams();
	const { theme, resolvedTheme, setTheme } = useTheme();
	const resetEditorState = useScreenplayStore((state) => state.resetEditorState);

	useEffect(() => {
		resetEditorState();

		return () => {
			endWritingSession();
			resetEditorState();
		};
	}, [documentId, resetEditorState]);

	if (!documentId) {
		return <Navigate to="/" replace />;
	}

	const handleBackToHub = () => {
		const currentDocument = useScreenplayStore.getState().currentDocument;
		navigate(getHubPathForDocument(currentDocument));
	};

	return (
		<ErrorBoundary label="editor">
			<Suspense fallback={<RouteLoadingFallback />}>
				<ScreenplayEditor
				key={documentId}
				documentId={documentId}
				theme={theme}
				resolvedTheme={resolvedTheme}
				onThemeChange={setTheme}
				onBackToHub={handleBackToHub}
			/>
			</Suspense>
		</ErrorBoundary>
	);
}

export default function App() {
	return (
		<DastanAppProvider>
			<ThemeProvider>
				<BrowserRouter>
					<Routes>
						<Route path="/" element={<HubPage />} />
						<Route path="/project/:projectId" element={<HubPage />} />
						<Route path="/script/:documentId" element={<EditorPage />} />
						<Route path="*" element={<Navigate to="/" replace />} />
					</Routes>
					<PwaInstallPrompt />
				</BrowserRouter>
			</ThemeProvider>
		</DastanAppProvider>
	);
}
