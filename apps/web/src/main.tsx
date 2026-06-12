import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if ('serviceWorker' in navigator) {
	if (import.meta.env.DEV) {
		void navigator.serviceWorker.getRegistrations().then((registrations) => {
			return Promise.all(registrations.map((registration) => registration.unregister()));
		});
		void caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
	} else {
		window.addEventListener('load', () => {
			void navigator.serviceWorker.register('/sw.js');
		});
	}
}
