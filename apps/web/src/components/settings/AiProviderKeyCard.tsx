import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
	AI_MODEL_REGISTRY,
	AI_PROVIDER_LABELS,
	getModelsForProvider,
	maskApiKey,
	type AiProvider,
} from '../../utils/ai-models';
import type { AiSettings } from '../../utils/ai-settings';

interface AiProviderKeyCardProps {
	provider: AiProvider;
	settings: AiSettings;
	isDark: boolean;
	fieldClass: string;
	labelClass: string;
	mutedClass: string;
	onSettingsChange: (settings: AiSettings) => void;
	onVerify: (provider: AiProvider) => Promise<void>;
	verifyStatus: string | null;
}

const apiKeyProviders: AiProvider[] = ['openai', 'anthropic', 'google', 'openrouter'];

export function AiProviderKeyCard({
	provider,
	settings,
	isDark,
	fieldClass,
	labelClass,
	mutedClass,
	onSettingsChange,
	onVerify,
	verifyStatus,
}: AiProviderKeyCardProps) {
	const [editing, setEditing] = useState(false);
	const [draftKey, setDraftKey] = useState('');
	const savedKey = settings.apiKeys[provider]?.trim() ?? '';
	const isConnected = savedKey.length > 0;

	if (provider === 'ollama') {
		const ollamaConnected = settings.ollamaBaseUrl.trim().length > 0;

		return (
			<Card className={isDark ? 'border-slate-700 bg-slate-800/50' : undefined}>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between gap-2">
						<CardTitle className={isDark ? 'text-slate-100' : undefined}>Ollama</CardTitle>
						{ollamaConnected ? (
							<Badge className="gap-1" variant="secondary">
								<CheckCircle2 size={12} />
								Connected
							</Badge>
						) : null}
					</div>
					<CardDescription className={isDark ? 'text-slate-400' : undefined}>
						Run models locally via an OpenAI-compatible Ollama endpoint.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-3">
					<label className="grid gap-2">
						<span className={`text-sm font-medium ${labelClass}`}>Base URL</span>
						<Input
							className={fieldClass}
							placeholder="http://localhost:11434/v1"
							value={settings.ollamaBaseUrl}
							onChange={(event) =>
								onSettingsChange({
									...settings,
									ollamaBaseUrl: event.target.value,
								})
							}
						/>
					</label>
					<div className="flex flex-wrap gap-2">
						<Button type="button" variant="outline" onClick={() => void onVerify('ollama')}>
							Verify
						</Button>
						{ollamaConnected ? (
							<Button
								type="button"
								variant="ghost"
								onClick={() =>
									onSettingsChange({
										...settings,
										ollamaBaseUrl: '',
									})
								}
							>
								Remove
							</Button>
						) : null}
					</div>
					{verifyStatus ? <p className={`text-xs ${mutedClass}`}>{verifyStatus}</p> : null}
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className={isDark ? 'border-slate-700 bg-slate-800/50' : undefined}>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between gap-2">
					<CardTitle className={isDark ? 'text-slate-100' : undefined}>{AI_PROVIDER_LABELS[provider]}</CardTitle>
					{isConnected && !editing ? (
						<Badge className="gap-1" variant="secondary">
							<CheckCircle2 size={12} />
							Connected
						</Badge>
					) : null}
				</div>
				{isConnected && !editing ? (
					<CardDescription className={isDark ? 'text-slate-400' : undefined}>
						{maskApiKey(savedKey)} — stored only in this browser&apos;s local storage and sent directly to your provider.
					</CardDescription>
				) : (
					<CardDescription className={isDark ? 'text-slate-400' : undefined}>
						Paste your {AI_PROVIDER_LABELS[provider]} API key. Stored only in this browser&apos;s local storage and sent directly to your provider — never to Dastan servers.
					</CardDescription>
				)}
			</CardHeader>
			<CardContent className="grid gap-3">
				{!isConnected || editing ? (
					<Input
						autoComplete="off"
						className={fieldClass}
						placeholder="sk-..."
						type="password"
						value={draftKey}
						onChange={(event) => setDraftKey(event.target.value)}
					/>
				) : null}

				<div className="flex flex-wrap gap-2">
					{!isConnected || editing ? (
						<Button
							type="button"
							onClick={() => {
								const trimmed = draftKey.trim();

								if (!trimmed) {
									return;
								}

								onSettingsChange({
									...settings,
									apiKeys: {
										...settings.apiKeys,
										[provider]: trimmed,
									},
								});
								setDraftKey('');
								setEditing(false);
							}}
						>
							Save key
						</Button>
					) : null}

					<Button type="button" variant="outline" onClick={() => void onVerify(provider)}>
						Verify
					</Button>

					{isConnected ? (
						<>
							{!editing ? (
								<Button type="button" variant="ghost" onClick={() => setEditing(true)}>
									Replace
								</Button>
							) : (
								<Button type="button" variant="ghost" onClick={() => setEditing(false)}>
									Cancel
								</Button>
							)}
							<Button
								type="button"
								variant="ghost"
								onClick={() => {
									const nextKeys = { ...settings.apiKeys };
									delete nextKeys[provider];
									onSettingsChange({ ...settings, apiKeys: nextKeys });
									setEditing(false);
									setDraftKey('');
								}}
							>
								Remove
							</Button>
						</>
					) : null}
				</div>

				{verifyStatus ? <p className={`text-xs ${mutedClass}`}>{verifyStatus}</p> : null}
			</CardContent>
		</Card>
	);
}

export function verifyAiProvider(
	settings: AiSettings,
	provider: AiProvider,
): Promise<string> {
	const apiKey =
		provider === 'ollama'
			? settings.ollamaBaseUrl.trim()
				? 'ollama'
				: undefined
			: settings.apiKeys[provider]?.trim();
	const model = getModelsForProvider(provider)[0]?.id ?? AI_MODEL_REGISTRY[0]?.id;

	if (!apiKey) {
		return Promise.resolve(
			provider === 'ollama'
				? 'Add an Ollama base URL first.'
				: `Add an API key for ${AI_PROVIDER_LABELS[provider]} first.`,
		);
	}

	return fetch(settings.chatApiUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(provider === 'ollama' ? {} : { 'x-api-key': apiKey }),
		},
		body: JSON.stringify({
			provider,
			model,
			system: 'Reply with exactly: Dastan AI connection OK.',
			...(provider === 'ollama' ? { ollamaBaseUrl: settings.ollamaBaseUrl } : {}),
			messages: [
				{
					id: 'test-user',
					role: 'user',
					parts: [{ type: 'text', text: 'Say the confirmation phrase.' }],
				},
			],
		}),
	})
		.then(async (response) => {
			if (!response.ok) {
				throw new Error(await response.text());
			}

			return 'Connection successful.';
		})
		.catch((error: unknown) => (error instanceof Error ? error.message : 'Connection failed.'));
}

export const AI_KEY_PROVIDERS = apiKeyProviders;
