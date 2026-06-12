import { useEffect, useState, type ReactNode } from 'react';
import { Menu, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getTimeGreeting } from '../../utils/hub-utils';
import { getHubTheme } from '../../utils/hub-theme';
import type { HubSection } from './types';

interface HubShellProps {
  isDark: boolean;
  activeSection: HubSection;
  trashedCount: number;
  penName: string;
  profileImageDataUrl: string | null;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSectionChange: (section: HubSection) => void;
  onOpenSettings: () => void;
  children: ReactNode;
}

const navItems: Array<{ key: HubSection; label: string }> = [
  { key: 'library', label: 'Library' },
  { key: 'shared', label: 'Shared' },
  { key: 'trash', label: 'Trash' },
];

function GraffitiNavLabel({ label, isActive, isDark }: { label: string; isActive: boolean; isDark: boolean }) {
  return (
    <span className="relative inline-flex items-center gap-1.5">
      <span className="relative">
        {isActive ? (
          <span
            aria-hidden
            className={`pointer-events-none absolute -inset-x-1.5 inset-y-0.5 -rotate-2 rounded-[2px] ${
              isDark ? 'bg-amber-400/40' : 'bg-amber-500/50'
            }`}
            style={{
              clipPath: 'polygon(2% 18%, 96% 8%, 98% 82%, 4% 92%)',
            }}
          />
        ) : null}
        <span className="relative text-xs font-black tracking-[0.12em] uppercase">{label}</span>
      </span>
    </span>
  );
}

interface HubSidebarProps {
  isDark: boolean;
  activeSection: HubSection;
  trashedCount: number;
  dashClass: string;
  mutedTextClass: string;
  logoClass: string;
  onSectionChange: (section: HubSection) => void;
  onOpenSettings: () => void;
}

function HubSidebar({
  isDark,
  activeSection,
  trashedCount,
  dashClass,
  mutedTextClass,
  logoClass,
  onSectionChange,
  onOpenSettings,
}: HubSidebarProps) {
  return (
    <>
      <div className="mb-8">
        <p className={`text-lg font-black tracking-[0.04em] ${logoClass}`}>Dastan</p>
      </div>

      <nav aria-label="Library sections" className="flex flex-1 flex-col">
        {navItems.map((item, index) => {
          const isActive = activeSection === item.key;
          const showBadge = item.key === 'trash' && trashedCount > 0;

          return (
            <div key={item.key}>
              {index > 0 ? <div className={`my-0.5 border-t border-dashed ${dashClass}`} /> : null}
              <button
                aria-current={isActive ? 'page' : undefined}
                className="flex w-full items-center py-2.5 text-left transition opacity-90 hover:opacity-100"
                type="button"
                onClick={() => onSectionChange(item.key)}
              >
                <GraffitiNavLabel isActive={isActive} isDark={isDark} label={item.label} />
                {showBadge ? (
                  <span
                    className={`ml-2 shrink-0 rounded-sm px-1 py-0.5 text-[8px] font-bold tracking-wider uppercase ${
                      isDark ? 'bg-amber-400 text-slate-900' : 'bg-neutral-950 text-amber-300'
                    }`}
                  >
                    {trashedCount}
                  </span>
                ) : null}
              </button>
            </div>
          );
        })}

        <div className={`my-0.5 border-t border-dashed ${dashClass}`} />

        <button
          className="py-2.5 text-left text-xs font-black tracking-[0.12em] uppercase opacity-90 transition hover:opacity-100"
          type="button"
          onClick={onOpenSettings}
        >
          Settings
        </button>
      </nav>

      <footer className={`mt-auto border-t border-dashed pt-3 text-[9px] ${dashClass}`}>
        <span className={mutedTextClass}>© Dastan 2026</span>
      </footer>
    </>
  );
}

export function HubShell({
  isDark,
  activeSection,
  trashedCount,
  penName,
  profileImageDataUrl,
  searchValue,
  onSearchChange,
  onSectionChange,
  onOpenSettings,
  children,
}: HubShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const greeting = `${getTimeGreeting()}, ${penName}`;
  const hub = getHubTheme(isDark);

  const sidebarClass = hub.sidebar;
  const dashClass = isDark ? 'border-slate-600/60' : 'border-neutral-950/20';
  const mutedTextClass = isDark ? 'text-amber-400/55' : 'text-neutral-950/55';
  const logoClass = isDark ? 'text-amber-400' : 'text-neutral-950';

  const handleSectionChange = (section: HubSection) => {
    onSectionChange(section);
    setMobileNavOpen(false);
  };

  const handleOpenSettings = () => {
    onOpenSettings();
    setMobileNavOpen(false);
  };

  useEffect(() => {
    if (!mobileNavOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileNavOpen]);

  const sidebarProps = {
    isDark,
    activeSection,
    trashedCount,
    dashClass,
    mutedTextClass,
    logoClass,
    onSectionChange: handleSectionChange,
    onOpenSettings: handleOpenSettings,
  };

  return (
    <div className={`flex h-screen overflow-hidden bg-background text-foreground ${isDark ? 'dark' : ''}`}>
      <aside className={`hidden w-[12.5rem] shrink-0 flex-col px-4 py-5 md:flex ${sidebarClass}`}>
        <HubSidebar {...sidebarProps} />
      </aside>

      {mobileNavOpen ? (
        <>
          <button
            aria-label="Close navigation menu"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            type="button"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside
            className={`fixed inset-y-0 left-0 z-50 flex w-[min(12.5rem,85vw)] flex-col px-4 py-5 shadow-xl md:hidden ${sidebarClass}`}
          >
            <div className="mb-4 flex items-center justify-end">
              <button
                aria-label="Close navigation menu"
                className="rounded-md p-1 opacity-80 transition hover:opacity-100"
                type="button"
                onClick={() => setMobileNavOpen(false)}
              >
                <X size={18} strokeWidth={2.25} />
              </button>
            </div>
            <HubSidebar {...sidebarProps} />
          </aside>
        </>
      ) : null}

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <header className="shrink-0 border-b border-border px-4 py-4 md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <button
                aria-expanded={mobileNavOpen}
                aria-label="Open navigation menu"
                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground transition hover:bg-accent md:hidden"
                type="button"
                onClick={() => setMobileNavOpen(true)}
              >
                <Menu size={18} strokeWidth={2.25} />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-tight">{greeting}</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">Pick up where you left off or start something new.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1 md:w-64 md:flex-none">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                  size={16}
                  strokeWidth={2.25}
                />
                <Input
                  aria-label="Search scripts and projects"
                  className="h-9 pl-9"
                  placeholder="Search scripts and projects..."
                  spellCheck={false}
                  value={searchValue}
                  onChange={(event) => onSearchChange(event.target.value)}
                />
              </div>
              <button
                className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-xs font-semibold text-foreground transition hover:bg-accent"
                type="button"
                aria-label="Open settings"
                onClick={onOpenSettings}
              >
                {profileImageDataUrl ? (
                  <img alt="" className="size-full object-cover" src={profileImageDataUrl} />
                ) : (
                  penName.slice(0, 2).toUpperCase()
                )}
              </button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">{children}</div>
      </main>
    </div>
  );
}
