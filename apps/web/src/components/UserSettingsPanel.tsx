import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Monitor, Moon, Sun, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSettingsTheme } from '../utils/hub-theme';
import { addShareContact, getShareContacts, removeShareContact, type ShareContact } from '../utils/share-contacts';
import {
	AI_PROVIDER_LABELS,
	AI_MODEL_REGISTRY,
	getModelsForProvider,
} from '../utils/ai-models';
import {
	defaultAiSettings,
	loadAiSettings,
	saveAiSettings,
	type AiProvider,
	type AiSettings,
} from '../utils/ai-settings';
import { getSessionMinutes, loadWritingStats, setDailyWordGoal } from '../utils/writing-stats';

export type UserThemeSetting = 'light' | 'dark' | 'system';

export type SettingsTab = 'profile' | 'preferences' | 'notifications' | 'addressBook' | 'ai';

interface UserSettingsPanelProps {
  theme: UserThemeSetting;
  resolvedTheme: 'light' | 'dark';
  onThemeChange: (theme: UserThemeSetting) => void;
  onClose: () => void;
  initialTab?: SettingsTab;
}

interface UserSettingsState {
  profileImageDataUrl: string | null;
  penName: string;
  yearsWriting: number;
  projectsCompleted: number;
  about: string;
  autoSaveCadence: 'auto' | '30s' | '1m' | '5m';
  defaultTemplate: 'screenplay' | 'teleplay' | 'short';
  recentItems: number;
  showFormatPalette: boolean;
  trackWritingStats: boolean;
  emailNotifications: boolean;
  collaboratorMentions: boolean;
  newsletter: boolean;
  addressBookVisibility: 'private' | 'team';
}

const userSettingsStorageKey = 'dastan.user-settings.v1';

const defaultUserSettings: UserSettingsState = {
  profileImageDataUrl: null,
  penName: 'Arif',
  yearsWriting: 0,
  projectsCompleted: 0,
  about: '',
  autoSaveCadence: 'auto',
  defaultTemplate: 'screenplay',
  recentItems: 15,
  showFormatPalette: true,
  trackWritingStats: true,
  emailNotifications: true,
  collaboratorMentions: true,
  newsletter: false,
  addressBookVisibility: 'private',
};

const settingsTabs: Array<{ key: SettingsTab; label: string }> = [
  { key: 'profile', label: 'Profile' },
  { key: 'preferences', label: 'Preferences' },
  { key: 'ai', label: 'AI' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'addressBook', label: 'Address Book' },
];

const apiKeyProviders: AiProvider[] = ['openai', 'anthropic', 'google', 'openrouter'];
const aiProviders: AiProvider[] = [...apiKeyProviders, 'ollama'];

function loadUserSettings(): UserSettingsState {
  if (typeof window === 'undefined') {
    return defaultUserSettings;
  }

  const raw = window.localStorage.getItem(userSettingsStorageKey);

  if (!raw) {
    return defaultUserSettings;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<UserSettingsState>;
    return {
      ...defaultUserSettings,
      ...parsed,
    };
  } catch {
    return defaultUserSettings;
  }
}

function SettingsField({ label, children, theme }: { label: string; children: ReactNode; theme: ReturnType<typeof getSettingsTheme> }) {
  return (
    <label className="grid gap-2">
      <span className={`text-sm font-medium ${theme.label}`}>{label}</span>
      {children}
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  theme,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  theme: ReturnType<typeof getSettingsTheme>;
}) {
  return (
    <label className={`flex cursor-pointer items-center justify-between gap-4 px-4 py-3 ${theme.surface}`}>
      <span className={`text-sm ${theme.label}`}>{label}</span>
      <input
        checked={checked}
        className="size-4 rounded border-stone-300 accent-amber-600"
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
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

export function UserSettingsPanel({ theme, resolvedTheme, onThemeChange, onClose, initialTab }: UserSettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab ?? 'profile');
  const [settings, setSettings] = useState<UserSettingsState>(() => loadUserSettings());
  const [aiSettings, setAiSettings] = useState<AiSettings>(() => loadAiSettings());
  const [aiTestStatus, setAiTestStatus] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ShareContact[]>(() => getShareContacts());
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactRole, setContactRole] = useState('');
  const profileImageInputRef = useRef<HTMLInputElement | null>(null);
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

  const activeTabLabel = settingsTabs.find((tab) => tab.key === activeTab)?.label ?? 'Settings';

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
        <p className={`mb-5 mt-1 text-[11px] uppercase tracking-[0.18em] ${ui.muted}`}>Account</p>

        <nav className="grid gap-1">
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
              <SettingsField label="Profile Picture" theme={ui}>
                <div className={`flex items-center gap-4 p-3 ${ui.surface}`}>
                  <div className={`flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border text-lg font-semibold ${isDark ? 'border-slate-600 bg-slate-700 text-slate-300' : 'border-stone-200 bg-stone-100 text-stone-500'}`}>
                    {settings.profileImageDataUrl ? (
                      <img className="size-full object-cover" src={settings.profileImageDataUrl} alt="Profile" />
                    ) : (
                      settings.penName.slice(0, 1).toUpperCase() || 'A'
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" type="button" onClick={() => profileImageInputRef.current?.click()}>
                      Upload Photo
                    </Button>
                    {settings.profileImageDataUrl ? (
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => setSettings((current) => ({ ...current, profileImageDataUrl: null }))}
                      >
                        Remove
                      </Button>
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

                      const reader = new FileReader();
                      reader.onload = () => {
                        const dataUrl = typeof reader.result === 'string' ? reader.result : null;

                        setSettings((current) => ({
                          ...current,
                          profileImageDataUrl: dataUrl,
                        }));
                      };
                      reader.readAsDataURL(file);
                      event.target.value = '';
                    }}
                  />
                </div>
              </SettingsField>

              <SettingsField label="Pen Name" theme={ui}>
                <Input
                  className={ui.field}
                  value={settings.penName}
                  onChange={(event) => setSettings((current) => ({ ...current, penName: event.target.value }))}
                />
              </SettingsField>

              <div className="grid grid-cols-2 gap-4">
                <SettingsField label="Years Writing" theme={ui}>
                  <Input
                    className={ui.field}
                    type="number"
                    min={0}
                    value={settings.yearsWriting}
                    onChange={(event) => setSettings((current) => ({ ...current, yearsWriting: Number(event.target.value) || 0 }))}
                  />
                </SettingsField>

                <SettingsField label="Projects Completed" theme={ui}>
                  <Input
                    className={ui.field}
                    type="number"
                    min={0}
                    value={settings.projectsCompleted}
                    onChange={(event) => setSettings((current) => ({ ...current, projectsCompleted: Number(event.target.value) || 0 }))}
                  />
                </SettingsField>
              </div>

              <SettingsField label="About" theme={ui}>
                <textarea
                  className={`min-h-32 px-3 py-2 text-sm ${ui.field}`}
                  value={settings.about}
                  onChange={(event) => setSettings((current) => ({ ...current, about: event.target.value }))}
                />
              </SettingsField>
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

              <SettingsField label="Default Template" theme={ui}>
                <select
                  className={`px-3 py-2.5 text-sm ${ui.field}`}
                  value={settings.defaultTemplate}
                  onChange={(event) => setSettings((current) => ({ ...current, defaultTemplate: event.target.value as UserSettingsState['defaultTemplate'] }))}
                >
                  <option value="screenplay">Screenplay</option>
                  <option value="teleplay">Teleplay</option>
                  <option value="short">Short Film</option>
                </select>
              </SettingsField>

              <SettingsField label="Recent Items" theme={ui}>
                <Input
                  className={ui.field}
                  type="number"
                  min={5}
                  max={50}
                  value={settings.recentItems}
                  onChange={(event) => setSettings((current) => ({ ...current, recentItems: Number(event.target.value) || 15 }))}
                />
              </SettingsField>

              <BinaryChoice
                label="Show Format Palette"
                value={settings.showFormatPalette}
                theme={ui}
                onChange={(value) => setSettings((current) => ({ ...current, showFormatPalette: value }))}
              />

              <BinaryChoice
                label="Track Writing Stats"
                value={settings.trackWritingStats}
                theme={ui}
                onChange={(value) => setSettings((current) => ({ ...current, trackWritingStats: value }))}
              />

              {settings.trackWritingStats ? (
                <Card className={isDark ? 'border-slate-700 bg-slate-800/50' : undefined}>
                  <CardHeader>
                    <CardTitle className={isDark ? 'text-slate-100' : undefined}>Writing progress</CardTitle>
                    <CardDescription className={isDark ? 'text-slate-400' : undefined}>
                      Local streaks and daily goals while you draft in the editor.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <SettingsField label="Daily word goal" theme={ui}>
                      <Input
                        className={ui.field}
                        min={50}
                        type="number"
                        value={loadWritingStats().dailyWordGoal}
                        onChange={(event) => setDailyWordGoal(Number(event.target.value) || 500)}
                      />
                    </SettingsField>
                    <div className={`rounded-xl border p-4 ${ui.surface}`}>
                      <p className={`text-xs uppercase tracking-[0.16em] ${ui.muted}`}>Today</p>
                      <p className="mt-1 text-2xl font-semibold tabular-nums">
                        {loadWritingStats().todayWords}
                        <span className={`ml-2 text-sm font-normal ${ui.muted}`}>/ {loadWritingStats().dailyWordGoal}</span>
                      </p>
                      <p className={`mt-2 text-sm ${ui.muted}`}>
                        {loadWritingStats().streakDays} day streak · {getSessionMinutes(loadWritingStats())} min this session
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          ) : null}

          {activeTab === 'ai' ? (
            <div className="mx-auto grid max-w-2xl gap-5">
              <Card className={isDark ? 'border-slate-700 bg-slate-800/50' : undefined}>
                <CardHeader>
                  <CardTitle className={isDark ? 'text-slate-100' : undefined}>API Keys</CardTitle>
                  <CardDescription className={isDark ? 'text-slate-400' : undefined}>
                    Bring your own provider keys. Keys stay in this browser and are sent only to the chat proxy when you message the assistant.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {apiKeyProviders.map((provider) => (
                    <SettingsField key={provider} label={`${AI_PROVIDER_LABELS[provider]} API Key`} theme={ui}>
                      <Input
                        autoComplete="off"
                        className={ui.field}
                        type="password"
                        placeholder={aiSettings.apiKeys[provider] ? 'Key saved — enter to replace' : 'sk-...'}
                        value={aiSettings.apiKeys[provider] ?? ''}
                        onChange={(event) =>
                          setAiSettings((current) => ({
                            ...current,
                            apiKeys: {
                              ...current.apiKeys,
                              [provider]: event.target.value,
                            },
                          }))
                        }
                      />
                    </SettingsField>
                  ))}
                </CardContent>
              </Card>

              <Card className={isDark ? 'border-slate-700 bg-slate-800/50' : undefined}>
                <CardHeader>
                  <CardTitle className={isDark ? 'text-slate-100' : undefined}>Ollama</CardTitle>
                  <CardDescription className={isDark ? 'text-slate-400' : undefined}>
                    Run models locally via an OpenAI-compatible Ollama endpoint. No API key required.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SettingsField label="Ollama Base URL" theme={ui}>
                    <Input
                      className={ui.field}
                      placeholder="http://localhost:11434/v1"
                      value={aiSettings.ollamaBaseUrl}
                      onChange={(event) =>
                        setAiSettings((current) => ({
                          ...current,
                          ollamaBaseUrl: event.target.value,
                        }))
                      }
                    />
                  </SettingsField>
                </CardContent>
              </Card>

              <Card className={isDark ? 'border-slate-700 bg-slate-800/50' : undefined}>
                <CardHeader>
                  <CardTitle className={isDark ? 'text-slate-100' : undefined}>Default Model</CardTitle>
                  <CardDescription className={isDark ? 'text-slate-400' : undefined}>
                    Choose the model used when a new chat starts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <SettingsField label="Provider" theme={ui}>
                    <select
                      className={`px-3 py-2.5 text-sm ${ui.field}`}
                      value={aiSettings.defaultProvider}
                      onChange={(event) => {
                        const provider = event.target.value as AiProvider;
                        const firstModel = getModelsForProvider(provider)[0]?.id ?? aiSettings.defaultModel;

                        setAiSettings((current) => ({
                          ...current,
                          defaultProvider: provider,
                          defaultModel: firstModel,
                        }));
                      }}
                    >
                      {aiProviders.map((provider) => (
                        <option key={provider} value={provider}>
                          {AI_PROVIDER_LABELS[provider]}
                        </option>
                      ))}
                    </select>
                  </SettingsField>

                  <SettingsField label="Model" theme={ui}>
                    <select
                      className={`px-3 py-2.5 text-sm ${ui.field}`}
                      value={aiSettings.defaultModel}
                      onChange={(event) =>
                        setAiSettings((current) => ({
                          ...current,
                          defaultModel: event.target.value,
                        }))
                      }
                    >
                      {getModelsForProvider(aiSettings.defaultProvider).map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  </SettingsField>

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
                </CardContent>
              </Card>

              <SettingsField label="Global Rules" theme={ui}>
                <textarea
                  className={`min-h-32 px-3 py-2 text-sm ${ui.field}`}
                  placeholder="Always use present tense in action lines. I write grounded sci-fi thrillers."
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
                label="Include Script Context"
                value={aiSettings.includeScriptContext}
                theme={ui}
                onChange={(value) => setAiSettings((current) => ({ ...current, includeScriptContext: value }))}
              />

              <BinaryChoice
                label="Include Workspace Context"
                value={aiSettings.includeWorkspaceContext}
                theme={ui}
                onChange={(value) => setAiSettings((current) => ({ ...current, includeWorkspaceContext: value }))}
              />

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAiSettings(defaultAiSettings);
                    setAiTestStatus('Restored default AI settings.');
                  }}
                >
                  Reset AI Settings
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const provider = aiSettings.defaultProvider;
                    const apiKey =
                      provider === 'ollama'
                        ? aiSettings.ollamaBaseUrl.trim()
                          ? 'ollama'
                          : undefined
                        : aiSettings.apiKeys[provider]?.trim();
                    const model = aiSettings.defaultModel || AI_MODEL_REGISTRY[0]?.id;

                    if (!apiKey) {
                      setAiTestStatus(
                        provider === 'ollama'
                          ? 'Add an Ollama base URL first.'
                          : `Add an API key for ${AI_PROVIDER_LABELS[provider]} first.`,
                      );
                      return;
                    }

                    void fetch(aiSettings.chatApiUrl, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(provider === 'ollama' ? {} : { 'x-api-key': apiKey }),
                      },
                      body: JSON.stringify({
                        provider,
                        model,
                        system: 'Reply with exactly: Dastan AI connection OK.',
                        ...(provider === 'ollama' ? { ollamaBaseUrl: aiSettings.ollamaBaseUrl } : {}),
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

                        setAiTestStatus('Connection successful. Open chat and start writing.');
                      })
                      .catch((error: unknown) => {
                        const message = error instanceof Error ? error.message : 'Connection failed.';
                        setAiTestStatus(message);
                      });
                  }}
                >
                  Test Connection
                </Button>
              </div>

              {aiTestStatus ? <p className={`text-sm ${ui.muted}`}>{aiTestStatus}</p> : null}
            </div>
          ) : null}

          {activeTab === 'notifications' ? (
            <div className="mx-auto max-w-2xl rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Notifications are coming soon</p>
              <p className="mt-2">
                Collaboration alerts and email digests will land here once cloud sync ships. For now, focus on writing locally without notification noise.
              </p>
            </div>
          ) : null}

          {activeTab === 'addressBook' ? (
            <div className="mx-auto grid max-w-2xl gap-4">
              <Card className={isDark ? 'border-slate-700 bg-slate-800/50' : undefined}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className={isDark ? 'text-slate-100' : undefined}>Address Book</CardTitle>
                      <CardDescription className={isDark ? 'text-slate-400' : undefined}>
                        Control who can discover you as a collaborator inside Dastan.
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{contacts.length} contacts</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs value={settings.addressBookVisibility} className="w-full" onValueChange={(value) => setSettings((current) => ({ ...current, addressBookVisibility: value as UserSettingsState['addressBookVisibility'] }))}>
                    <TabsList variant="default">
                      <TabsTrigger value="private">Private</TabsTrigger>
                      <TabsTrigger value="team">Team only</TabsTrigger>
                    </TabsList>
                    <TabsContent value="private" className={`pt-4 text-sm ${ui.muted}`}>
                      Only you can discover and select these contacts by default.
                    </TabsContent>
                    <TabsContent value="team" className={`pt-4 text-sm ${ui.muted}`}>
                      Contacts are discoverable to your team-level collaboration workflows.
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <Card className={isDark ? 'border-slate-700 bg-slate-800/50' : undefined}>
                <CardHeader>
                  <CardTitle className={isDark ? 'text-slate-100' : undefined}>Add Contact</CardTitle>
                  <CardDescription className={isDark ? 'text-slate-400' : undefined}>
                    Build your share list once and reuse it in project and script sharing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="grid gap-2 md:grid-cols-3">
                    <Input placeholder="Name" value={contactName} onChange={(event) => setContactName(event.target.value)} />
                    <Input placeholder="Email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
                    <Input placeholder="Role (optional)" value={contactRole} onChange={(event) => setContactRole(event.target.value)} />
                  </div>
                  <div>
                    <Button
                      type="button"
                      onClick={() => {
                        const next = addShareContact({
                          name: contactName,
                          email: contactEmail,
                          role: contactRole,
                        });

                        setContacts(next);
                        setContactName('');
                        setContactEmail('');
                        setContactRole('');
                      }}
                    >
                      Add Contact
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className={isDark ? 'border-slate-700 bg-slate-800/50' : undefined}>
                <CardHeader>
                  <CardTitle className={isDark ? 'text-slate-100' : undefined}>Saved Contacts</CardTitle>
                  <CardDescription className={isDark ? 'text-slate-400' : undefined}>People available in the share dialog.</CardDescription>
                </CardHeader>
                <CardContent>
                  {contacts.length === 0 ? (
                    <p className={`text-sm ${ui.muted}`}>No contacts yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {contacts.map((contact) => (
                        <div
                          key={contact.id}
                          className={`flex items-center justify-between rounded-lg border px-3 py-3 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-stone-200 bg-stone-50'}`}
                        >
                          <div className="min-w-0 pr-3">
                            <div className="flex items-center gap-2">
                              <p className={`truncate text-sm font-medium ${ui.title}`}>{contact.name}</p>
                              {contact.role ? <Badge variant="secondary">{contact.role}</Badge> : null}
                            </div>
                            <p className={`truncate text-xs ${ui.muted}`}>{contact.email}</p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            type="button"
                            onClick={() => {
                              const next = removeShareContact(contact.id);
                              setContacts(next);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
