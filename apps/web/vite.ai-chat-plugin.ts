import type { Plugin, ViteDevServer } from 'vite';

async function loadChatHandler(server: ViteDevServer) {
	const module = await server.ssrLoadModule('@dastan/ai-providers/server');
	return module.handleChatRequest as (request: Request) => Promise<Response>;
}

export function aiChatDevPlugin(): Plugin {
	return {
		name: 'dastan-ai-chat-dev',
		configureServer(server) {
			server.middlewares.use('/api/chat', (req, res, next) => {
				if (req.method !== 'POST') {
					next();
					return;
				}

				const chunks: Buffer[] = [];

				req.on('data', (chunk: Buffer) => {
					chunks.push(chunk);
				});

				req.on('end', () => {
					void (async () => {
						try {
							const headers = new Headers();

							for (const [key, value] of Object.entries(req.headers)) {
								if (typeof value === 'string') {
									headers.set(key, value);
								} else if (Array.isArray(value)) {
									headers.set(key, value.join(', '));
								}
							}

							const apiKeyHeader = req.headers['x-api-key'];
							if (apiKeyHeader) {
								headers.set(
									'x-api-key',
									Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader,
								);
							}

							const request = new Request('http://localhost/api/chat', {
								method: 'POST',
								headers,
								body: Buffer.concat(chunks),
							});

							const handleChatRequest = await loadChatHandler(server);
							const response = await handleChatRequest(request);
							res.statusCode = response.status;

							response.headers.forEach((value, key) => {
								res.setHeader(key, value);
							});

							if (!response.body) {
								res.end();
								return;
							}

							const reader = response.body.getReader();

							while (true) {
								const { done, value } = await reader.read();

								if (done) {
									break;
								}

								res.write(Buffer.from(value));
							}

							res.end();
						} catch (error) {
							const message = error instanceof Error ? error.message : 'Chat handler failed.';
							res.statusCode = 500;
							res.end(message);
						}
					})();
				});
			});
		},
	};
};
