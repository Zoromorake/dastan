import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { DastanServices } from '@dastan/plugin-api';
import { createDastanAppAsync } from '../bootstrap/createDastanApp';

const DastanAppContext = createContext<DastanServices | null>(null);

export interface DastanAppProviderProps {
	services?: DastanServices;
	children: ReactNode;
}

function DastanAppBootstrap({ children }: { children: ReactNode }) {
	const [services, setServices] = useState<DastanServices | null>(null);

	useEffect(() => {
		let cancelled = false;

		void createDastanAppAsync({
			cloudUrl: import.meta.env.VITE_DASTAN_CLOUD_URL,
		}).then((nextServices) => {
			if (!cancelled) {
				setServices(nextServices);
			}
		});

		return () => {
			cancelled = true;
		};
	}, []);

	if (!services) {
		return null;
	}

	return <DastanAppContext.Provider value={services}>{children}</DastanAppContext.Provider>;
}

export function DastanAppProvider({ services, children }: DastanAppProviderProps) {
	if (services) {
		return <DastanAppContext.Provider value={services}>{children}</DastanAppContext.Provider>;
	}

	return <DastanAppBootstrap>{children}</DastanAppBootstrap>;
}

export function useDastanApp(): DastanServices {
	const services = useContext(DastanAppContext);

	if (!services) {
		throw new Error('useDastanApp must be used within DastanAppProvider after bootstrap completes.');
	}

	return services;
}
