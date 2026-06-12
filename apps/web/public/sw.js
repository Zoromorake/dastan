const CACHE_NAME = 'dastan-shell-v2';
const SHELL_URLS = ['/', '/index.html', '/manifest.webmanifest'];

function isNavigationRequest(request) {
	return (
		request.mode === 'navigate' ||
		(request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))
	);
}

function isBundledAsset(url) {
	return url.pathname.startsWith('/assets/') || /\.(?:js|css|mjs)$/u.test(url.pathname);
}

function shouldBypassCache(url) {
	return url.pathname.startsWith('/@') || url.pathname.includes('node_modules') || url.pathname.startsWith('/src/');
}

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(SHELL_URLS))
			.then(() => self.skipWaiting()),
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
			.then(() => self.clients.claim()),
	);
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') {
		return;
	}

	const url = new URL(event.request.url);

	if (url.origin !== self.location.origin || shouldBypassCache(url)) {
		return;
	}

	if (isBundledAsset(url)) {
		event.respondWith(
			fetch(event.request)
				.then((response) => {
					if (response.ok) {
						const copy = response.clone();
						void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
					}

					return response;
				})
				.catch(() => caches.match(event.request)),
		);
		return;
	}

	if (isNavigationRequest(event.request)) {
		event.respondWith(
			fetch(event.request)
				.then((response) => {
					if (response.ok) {
						const copy = response.clone();
						void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
					}

					return response;
				})
				.catch(() => caches.match('/index.html')),
		);
		return;
	}

	event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
