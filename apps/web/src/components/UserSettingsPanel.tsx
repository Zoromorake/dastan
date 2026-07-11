import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Monitor, Moon, Sun, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSettingsTheme } from '../utils/hub-theme';
import {
	defaultAiSettings,
	loadAiSettings,
	saveAiSettings,
	type AiProvider,
	type AiSettings,
} from '../utils/ai-settings';
import { ImageCropDialog } from './ImageCropDialog';
import { readFileAsDataUrl } from '../utils/image-crop';
import { AddressBookPanel } from './AddressBookPanel';
import { CloudAccountSection } from './settings/CloudAccountSection';
import { isDevEditorAiEnabled } from '../utils/dev-editor-ai';
import { LocalOnlyModal } from './settings/LocalOnlyModal';
import { AiSlashCommandsSettings } from './settings/AiSlashCommandsSettings';
import {
	loadUserSettings,
	SCRIPT_TEMPLATE_LABELS,
	type ScriptTemplate,
	type SettingsTab,
	type UserSettingsState,
	type UserThemeSetting,
	userSettingsStorageKey,
} from '../utils/user-settings';
import { hasAcknowledgedLocalOnlyMode } from '../utils/local-identity';
import { EtymologyLine } from './EtymologyLine';
import { useDastanApp } from '../context/DastanAppProvider';
import type { AiSettingsSection } from '../utils/ai-settings-sections';
import { AI_SETTINGS_SECTION_IDS } from '../utils/ai-settings-sections';
import { loadInteractionMode, saveInteractionMode, type AiInteractionMode } from '../utils/ai-interaction-mode';
import {
	AI_KEY_PROVIDERS,
	AiProviderKeyCard,
	verifyAiProvider,
} from './settings/AiProviderKeyCard';

export type { SettingsTab, UserThemeSetting };

interface UserSettingsPanelProps {
	theme: UserThemeSetting;
	resolvedTheme: 'light' | 'dark';
	onThemeChange: (theme: UserThemeSetting) => void;
	onClose: () => void;
	initialTab?: SettingsTab;
	initialAiSection?: AiSettingsSection;
}

const settingsTabs: Array<{ key: SettingsTab; label: string }> = [
	{ key: 'profile', label: 'Profile' },
	{ key: 'preferences', label: 'Preferences' },
	{ key: 'ai', label: 'AI' },
	{ key: 'addressBook', label: 'Address Book' },
];

function SettingsField({ label, children, theme }: { label: string; children: ReactNode; theme: ReturnType<typeof getSettingsTheme> }) {
	return (
		<label className="grid gap-2">
			<span className={`text-sm font-medium ${theme.label}`}>{label}</span>
			{children}
		</label>
	);
}

function BinaryChoice({
	label,
	value,
	onChange,
	theme,
}: {
	label: string;
	value: boolean;
	onChange: (value: boolean) => void;
	theme: ReturnType<typeof getSettingsTheme>;
}) {
	return (
		<div className={`grid grid-cols-2 gap-2 p-2 ${theme.themePicker} rounded-xl`}>
			<button
				className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${value ? theme.themeOptionActive : theme.themeOption}`}
				type="button"
				onClick={() => onChange(true)}
			>
				{label}: Yes
			</button>
			<button
				className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${!value ? theme.themeOptionActive : theme.themeOption}`}
				type="button"
				onClick={() => onChange(false)}
			>
				{label}: No
			</button>
		</div>
	);
}

export function UserSettingsPanel({ theme, resolvedTheme, onThemeChange, onClose, initialTab, initialAiSection }: UserSettingsPanelProps) {
	const { entitlements } = useDastanApp();
	const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab ?? 'profile');
	const [settings, setSettings] = useState<UserSettingsState>(() => loadUserSettings());
	const [aiSettings, setAiSettings] = useState<AiSettings>(() => loadAiSettings());
	const [showLocalOnlyModal, setShowLocalOnlyModal] = useState(() => !hasAcknowledgedLocalOnlyMode());
	const [verifyStatus, setVerifyStatus] = useState<{ provider: AiProvider | null; message: string | null }>({
		provider: null,
		message: null,
	});
	const [advancedOpen, setAdvancedOpen] = useState(false);
	const profileImageInputRef = useRef<HTMLInputElement | null>(null);
	const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
	const isDark = resolvedTheme === 'dark';
	const ui = useMemo(() => getSettingsTheme(isDark), [isDark]);

	useEffect(() => {
		const previousBodyOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		return () => {
			document.body.style.overflow = previousBodyOverflow;
		};
	}, []);

	useEffect(() => {
		window.localStorage.setItem(userSettingsStorageKey, JSON.stringify(settings));
		window.dispatchEvent(new CustomEvent('dastan:typewriter-mode-changed', { detail: settings.typewriterMode }));
	}, [settings]);

	useEffect(() => {
		saveAiSettings(aiSettings);
	}, [aiSettings]);

	useEffect(() => {
		if (!initialTab) {
			return;
		}

		setActiveTab(initialTab);
	}, [initialTab]);

	useEffect(() => {
		if (!initialAiSection) {
			return;
		}

		const id = AI_SETTINGS_SECTION_IDS[initialAiSection];
		const element = document.getElementById(id);
		element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}, [initialAiSection, activeTab]);

	const activeTabLabel = settingsTabs.find((tab) => tab.key === activeTab)?.label ?? 'Settings';
	const planLabel = entitlements.plan();

	const handleVerify = async (provider: AiProvider) => {
		setVerifyStatus({ provider, message: 'Verifying…' });
		const message = await verifyAiProvider(aiSettings, provider);
		setVerifyStatus({ provider, message });
	};

	return (
		<section
			className={`mx-auto mt-6 flex h-[min(86vh,820px)] w-full max-w-5xl overflow-hidden rounded-2xl border ${ui.shell}`}
			role="dialog"
			aria-modal="true"
			aria-label="Settings"
			onMouseDown={(event) => {
				event.stopPropagation();
			}}
		>
			<aside className={`flex w-60 shrink-0 flex-col border-r p-5 ${ui.sidebar}`}>
				<h2 className={`text-lg font-semibold ${ui.title}`}>Settings</h2>

				<nav className="mt-5 grid gap-1">
					{settingsTabs.map((tab) => (
						<button
							key={tab.key}
							className={`rounded-lg px-3 py-2 text-left text-sm font-medium transition ${activeTab === tab.key ? ui.navActive : ui.navItem}`}
							type="button"
							onClick={() => setActiveTab(tab.key)}
						>
							{tab.label}
						</button>
					))}
				</nav>
			</aside>

			<div className={`flex min-h-0 min-w-0 flex-1 flex-col ${ui.content}`}>
				<div className="flex shrink-0 items-center justify-between border-b px-6 py-4" style={{ borderColor: isDark ? 'rgb(51 65 85 / 0.8)' : 'rgb(231 229 228)' }}>
					<h3 className={`text-xl font-semibold ${ui.title}`}>{activeTabLabel}</h3>
					<Button
						className={isDark ? 'text-slate-300 hover:bg-slate-800 hover:text-slate-100' : undefined}
						size="icon"
						variant="ghost"
						type="button"
						aria-label="Close settings"
						onClick={onClose}
					>
						<X size={18} />
					</Button>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
					{activeTab === 'profile' ? (
						<div className="mx-auto grid max-w-2xl gap-5">
							<div className="flex flex-col items-center gap-4 text-center">
								<div
									className={`flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 text-3xl font-semibold ${isDark ? 'border-slate-600 bg-slate-700 text-slate-300' : 'border-stone-200 bg-stone-100 text-stone-500'}`}
								>
									{settings.profileImageDataUrl ? (
										<img className="size-full object-cover" src={settings.profileImageDataUrl} alt="Profile" />
									) : (
										settings.penName.slice(0, 1).toUpperCase() || 'A'
									)}
								</div>

								<div className="flex flex-wrap items-center justify-center gap-2">
									<Button variant="outline" type="button" onClick={() => profileImageInputRef.current?.click()}>
										Upload Photo
									</Button>
									{settings.profileImageDataUrl ? (
										<>
											<Button variant="outline" type="button" onClick={() => setCropImageSrc(settings.profileImageDataUrl)}>
												Adjust crop
											</Button>
											<Button
												variant="ghost"
												type="button"
												onClick={() => setSettings((current) => ({ ...current, profileImageDataUrl: null }))}
											>
												Remove
											</Button>
										</>
									) : null}
								</div>

								<input
									ref={profileImageInputRef}
									className="hidden"
									type="file"
									accept="image/png,image/jpeg,image/jpg,image/webp"
									onChange={(event) => {
										const file = event.target.files?.[0];

										if (!file) {
											return;
										}

										void readFileAsDataUrl(file).then((dataUrl) => {
											setCropImageSrc(dataUrl);
										});

										event.target.value = '';
									}}
								/>
							</div>

							<SettingsField label="Pen Name" theme={ui}>
								<Input
									className={ui.field}
									value={settings.penName}
									onChange={(event) => setSettings((current) => ({ ...current, penName: event.target.value }))}
								/>
							</SettingsField>

							<div className={`rounded-xl border px-4 py-3 ${ui.surface}`}>
								<p className={`mb-2 text-sm font-medium ${ui.label}`}>About the name</p>
								<EtymologyLine />
							</div>

							<CloudAccountSection theme={ui} />
						</div>
					) : null}

					{activeTab === 'preferences' ? (
						<div className="mx-auto grid max-w-2xl gap-5">
							<div>
								<p className={`text-sm font-medium ${ui.label}`}>Theme</p>
								<p className={`mb-3 mt-1 text-sm ${ui.muted}`}>Day, night, or match your system.</p>
								<div className={`grid grid-cols-3 gap-2 rounded-xl p-2 ${ui.themePicker}`}>
									{([
										{ value: 'light' as const, label: 'Light', icon: Sun },
										{ value: 'dark' as const, label: 'Dark', icon: Moon },
										{ value: 'system' as const, label: 'System', icon: Monitor },
									]).map((option) => {
										const Icon = option.icon;
										const isActive = theme === option.value;

										return (
											<button
												key={option.value}
												className={`flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-sm font-medium transition ${isActive ? ui.themeOptionActive : ui.themeOption}`}
												type="button"
												onClick={() => onThemeChange(option.value)}
											>
												<Icon size={18} />
												{option.label}
											</button>
										);
									})}
								</div>
							</div>

							<SettingsField label="Auto-Save Cadence" theme={ui}>
								<select
									className={`px-3 py-2.5 text-sm ${ui.field}`}
									value={settings.autoSaveCadence}
									onChange={(event) => setSettings((current) => ({ ...current, autoSaveCadence: event.target.value as UserSettingsState['autoSaveCadence'] }))}
								>
									<option value="auto">Auto (SmartSave)</option>
									<option value="30s">Every 30 seconds</option>
									<option value="1m">Every minute</option>
									<option value="5m">Every 5 minutes</option>
								</select>
							</SettingsField>

							<SettingsField label="Default format" theme={ui}>
								<select
									className={`px-3 py-2.5 text-sm ${ui.field}`}
									value={settings.defaultTemplate}
									onChange={(event) =>
										setSettings((current) => ({
											...current,
											defaultTemplate: event.target.value as ScriptTemplate,
										}))
									}
								>
									{(Object.keys(SCRIPT_TEMPLATE_LABELS) as ScriptTemplate[]).map((template) => (
										<option key={template} value={template}>
											{SCRIPT_TEMPLATE_LABELS[template]}
										</option>
									))}
								</select>
								<p className={`text-xs ${ui.muted}`}>Highlighted in the template picker when you create a new script.</p>
							</SettingsField>

							<BinaryChoice
								label="Show Format Palette"
								value={settings.showFormatPalette}
								theme={ui}
								onChange={(value) => setSettings((current) => ({ ...current, showFormatPalette: value }))}
							/>

							<div>
							<BinaryChoice
								label="Typewriter Mode"
								value={settings.typewriterMode}
								theme={ui}
								onChange={(value) => setSettings((current) => ({ ...current, typewriterMode: value }))}
							/>
							<p className={`mt-2 text-xs ${ui.muted}`}>Keeps the current line vertically centered as you type.</p>
						</div>

						<p className={`text-sm ${ui.muted}`}>
								<a
									className="underline underline-offset-2 hover:text-foreground"
									href={import.meta.env.VITE_DASTAN_DOCS_URL ?? 'https://docs.dastan.app'}
									rel="noreferrer"
									target="_blank"
								>
									Documentation
								</a>
							</p>
						</div>
					) : null}

					{activeTab === 'ai' ? (
						<div className="mx-auto grid max-w-2xl gap-6">
							<div className={`rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-slate-700 bg-slate-800/40 text-slate-300' : 'border-stone-200 bg-stone-50 text-stone-700'}`}>
								<p className="font-medium">Plan: {planLabel}</p>
								<p className={`mt-1 text-xs ${ui.muted}`}>
									Bring your own API keys below to use AI at your cost.{' '}
									{entitlements.canUseEditorAi()
										? isDevEditorAiEnabled()
											? 'Editor AI (agentic editing) is enabled in this dev build.'
											: 'Editor AI (agentic editing) is enabled for your account.'
										: 'Ask and Planner modes work for everyone. Editor AI is available with your own API key — no cloud account required.'}
								</p>
							</div>

							<section className="scroll-mt-4 space-y-3" id={AI_SETTINGS_SECTION_IDS.providers}>
								<h3 className={`text-sm font-semibold ${ui.label}`}>Providers &amp; Keys</h3>
								{AI_KEY_PROVIDERS.map((provider) => (
									<AiProviderKeyCard
										key={provider}
										provider={provider}
										settings={aiSettings}
										isDark={isDark}
										fieldClass={ui.field}
										labelClass={ui.label}
										mutedClass={ui.muted}
										verifyStatus={verifyStatus.provider === provider ? verifyStatus.message : null}
										onSettingsChange={setAiSettings}
										onVerify={handleVerify}
									/>
								))}
								<AiProviderKeyCard
									provider="ollama"
									settings={aiSettings}
									isDark={isDark}
									fieldClass={ui.field}
									labelClass={ui.label}
									mutedClass={ui.muted}
									verifyStatus={verifyStatus.provider === 'ollama' ? verifyStatus.message : null}
									onSettingsChange={setAiSettings}
									onVerify={handleVerify}
								/>
							</section>

							<section className="scroll-mt-4 space-y-3" id={AI_SETTINGS_SECTION_IDS.models}>
								<h3 className={`text-sm font-semibold ${ui.label}`}>Models</h3>
								<SettingsField label="Default model" theme={ui}>
									<Input
										className={ui.field}
										value={aiSettings.defaultModel}
										onChange={(event) =>
											setAiSettings((current) => ({ ...current, defaultModel: event.target.value }))
										}
									/>
								</SettingsField>
								<p className={`text-xs ${ui.muted}`}>
									Auto picks the best configured model per request. Per-script defaults live in the chat overflow menu.
								</p>
							</section>

							<section className="scroll-mt-4 space-y-3" id={AI_SETTINGS_SECTION_IDS.behavior}>
								<h3 className={`text-sm font-semibold ${ui.label}`}>Behavior</h3>
								<SettingsField label="Default interaction mode" theme={ui}>
									<select
										className={`h-10 w-full px-3 text-sm ${ui.field}`}
										value={loadInteractionMode('planner')}
										onChange={(event) => saveInteractionMode(event.target.value as AiInteractionMode)}
									>
										<option value="ask">Ask</option>
										<option value="planner">Planner</option>
										<option value="editor">Editor</option>
									</select>
								</SettingsField>
								<SettingsField label="Slash commands" theme={ui}>
									<AiSlashCommandsSettings theme={ui} />
								</SettingsField>
								<SettingsField label="Global writer rules" theme={ui}>
									<textarea
										className={`min-h-32 px-3 py-2 text-sm ${ui.field}`}
										placeholder="Always write in present tense…"
										value={aiSettings.globalRules}
										onChange={(event) =>
											setAiSettings((current) => ({
												...current,
												globalRules: event.target.value,
											}))
										}
									/>
								</SettingsField>
								<BinaryChoice
									label="Default include script context"
									value={aiSettings.includeScriptContext}
									theme={ui}
									onChange={(value) => setAiSettings((current) => ({ ...current, includeScriptContext: value }))}
								/>
								<BinaryChoice
									label="Default include workspace context"
									value={aiSettings.includeWorkspaceContext}
									theme={ui}
									onChange={(value) => setAiSettings((current) => ({ ...current, includeWorkspaceContext: value }))}
								/>
							</section>

							<section className="scroll-mt-4 space-y-3" id={AI_SETTINGS_SECTION_IDS.memory}>
								<h3 className={`text-sm font-semibold ${ui.label}`}>Memory</h3>
								<BinaryChoice
									label="Suggest memories from chat"
									value={aiSettings.autoSuggestMemories}
									theme={ui}
									onChange={(value) => setAiSettings((current) => ({ ...current, autoSuggestMemories: value }))}
								/>
								<p className={`text-xs ${ui.muted}`}>
									Suggestions land in the memory drawer for review — they never join context until approved.
								</p>
							</section>

							<section className="scroll-mt-4 space-y-3" id={AI_SETTINGS_SECTION_IDS['today-panel']}>
								<h3 className={`text-sm font-semibold ${ui.label}`}>Today Panel</h3>
								<BinaryChoice
									label="AI in the Today panel"
									value={settings.aiTodayPanel}
									theme={ui}
									onChange={(value) => setSettings((current) => ({ ...current, aiTodayPanel: value }))}
								/>
								<p className={`text-xs ${ui.muted}`}>
									When enabled and a provider key exists, shows one cached line per day in the hub.
								</p>
							</section>

							<button
								className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium ${isDark ? 'border-slate-700 text-slate-200' : 'border-stone-200 text-stone-800'}`}
								type="button"
								onClick={() => setAdvancedOpen((current) => !current)}
							>
								Advanced
								<ChevronDown className={`size-4 transition ${advancedOpen ? 'rotate-180' : ''}`} />
							</button>

							{advancedOpen ? (
								<SettingsField label="Chat API URL" theme={ui}>
									<Input
										className={ui.field}
										value={aiSettings.chatApiUrl}
										onChange={(event) =>
											setAiSettings((current) => ({
												...current,
												chatApiUrl: event.target.value,
											}))
										}
									/>
								</SettingsField>
							) : null}

							<div className="flex flex-wrap items-center gap-3">
								<Button
									type="button"
									variant="outline"
									onClick={() => {
										setAiSettings(defaultAiSettings);
										setVerifyStatus({ provider: null, message: 'Restored default AI settings.' });
									}}
								>
									Reset AI Settings
								</Button>
							</div>

							{verifyStatus.message && verifyStatus.provider === null ? (
								<p className={`text-sm ${ui.muted}`}>{verifyStatus.message}</p>
							) : null}
						</div>
					) : null}

					{activeTab === 'addressBook' ? <AddressBookPanel isDark={isDark} /> : null}
				</div>
			</div>

			<ImageCropDialog
				open={cropImageSrc !== null}
				imageSrc={cropImageSrc}
				title="Crop profile photo"
				description="Drag and zoom to frame your photo."
				aspectRatio={1}
				cropWidth={280}
				cropHeight={280}
				outputWidth={512}
				outputHeight={512}
				previewClassName="rounded-full"
				onClose={() => setCropImageSrc(null)}
				onComplete={(dataUrl) => {
					setSettings((current) => ({
						...current,
						profileImageDataUrl: dataUrl,
					}));
					setCropImageSrc(null);
				}}
			/>
			<LocalOnlyModal
				open={showLocalOnlyModal}
				onClose={() => setShowLocalOnlyModal(false)}
			/>
		</section>
	);
}
