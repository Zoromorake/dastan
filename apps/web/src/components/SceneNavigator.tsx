import { useEffect, useState } from 'react';
import type { ScreenplaySceneReference, ScreenplayVersionSnapshot } from '../types';
import { getEditorTheme } from '../utils/editor-theme';
import { getVersionHistory } from '../utils/screenplay-storage';

interface SceneNavigatorProps {
  collapsed: boolean;
  mode: 'scenes' | 'versions';
  scenes: ScreenplaySceneReference[];
  documentId: string;
  resolvedTheme: 'light' | 'dark';
  onModeChange: (mode: 'scenes' | 'versions') => void;
  onToggleCollapsed: () => void;
  onSceneSelect: (sceneIndex: number) => void;
  onOpenVersionHistory: () => void;
  onRestoreVersion: (versionId: string) => void;
}

function formatRelativeDate(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const hourMs = 60 * 60 * 1000;
  const dayMs = 24 * hourMs;

  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.floor(diffMs / (60 * 1000)));
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  if (diffMs < dayMs) {
    const hours = Math.floor(diffMs / hourMs);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  if (diffMs < dayMs * 2) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatVersionLabel(version: ScreenplayVersionSnapshot): string {
  if (version.label && version.label.trim().length > 0) {
    return version.label.trim();
  }

  return version.isManual ? 'Manual checkpoint' : 'Autosave';
}

export function SceneNavigator({
  collapsed,
  mode,
  scenes,
  documentId,
  resolvedTheme,
  onModeChange,
  onToggleCollapsed,
  onSceneSelect,
  onOpenVersionHistory,
  onRestoreVersion,
}: SceneNavigatorProps) {
  const isDark = resolvedTheme === 'dark';
  const theme = getEditorTheme(isDark);
  const [versions, setVersions] = useState<ScreenplayVersionSnapshot[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  useEffect(() => {
    if (collapsed || mode !== 'versions') {
      return;
    }

    let active = true;
    setVersionsLoading(true);

    void (async () => {
      const nextVersions = await getVersionHistory(documentId);

      if (active) {
        setVersions(nextVersions);
        setVersionsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [collapsed, documentId, mode]);

  return (
    <>
      {!collapsed ? (
        <button
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          type="button"
          onClick={onToggleCollapsed}
        />
      ) : null}
      <aside
        className={`flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-r transition-all duration-200 ${theme.sidebar} ${collapsed ? 'w-12' : 'w-64 max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:shadow-xl'}`}
      >
        <div className={`flex h-11 items-center justify-between border-b px-2 text-xs uppercase tracking-[0.14em] ${theme.sidebarHeader}`}>
          {!collapsed ? (
            <div className="flex items-center gap-1.5">
              <button
                aria-pressed={mode === 'scenes'}
                className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${mode === 'scenes' ? theme.modeActive : theme.modeIdle}`}
                type="button"
                onClick={() => onModeChange('scenes')}
              >
                Scenes
              </button>
              <button
                aria-pressed={mode === 'versions'}
                className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${mode === 'versions' ? theme.modeActive : theme.modeIdle}`}
                type="button"
                onClick={() => onModeChange('versions')}
              >
                Versions
              </button>
            </div>
          ) : null}
          <button
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`ml-auto rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${theme.statusPill}`}
            type="button"
            onClick={onToggleCollapsed}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        {!collapsed && mode === 'scenes' ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-sm text-foreground">
            <div
              className={`grid shrink-0 grid-cols-[2.25rem_minmax(0,1fr)] gap-2 border-b px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] ${theme.sidebarHeader}`}
            >
              <span className="text-center">#</span>
              <span>Scene</span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {scenes.length === 0 ? (
                <p className={`px-3 py-4 text-sm ${theme.statusText}`}>No scenes yet.</p>
              ) : (
                <div className="divide-y divide-border/70">
                  {scenes.map((scene, index) => (
                    <button
                      key={`${scene.index}-${index}`}
                      className="grid w-full grid-cols-[2.25rem_minmax(0,1fr)] gap-2 px-2 py-2.5 text-left transition hover:bg-accent/50"
                      type="button"
                      onClick={() => onSceneSelect(scene.index)}
                    >
                      <span className={`pt-0.5 text-center text-xs font-semibold tabular-nums ${theme.statusText}`}>
                        {index + 1}
                      </span>
                      <span className="min-w-0 truncate text-sm leading-snug">
                        {scene.text.length > 0 ? scene.text : 'Untitled scene'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : !collapsed && mode === 'versions' ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-sm text-foreground">
            <div className="shrink-0 border-b px-2 py-2">
              <button
                className={`block w-full rounded-md border px-2 py-2 text-left text-[10px] uppercase tracking-[0.12em] ${theme.statusPill}`}
                type="button"
                onClick={onOpenVersionHistory}
              >
                Open version history
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {versionsLoading ? <p className={`text-sm ${theme.statusText}`}>Loading versions…</p> : null}
              {!versionsLoading && versions.length === 0 ? (
                <p className={`text-sm ${theme.statusText}`}>No saved versions yet.</p>
              ) : null}
              {!versionsLoading && versions.length > 0 ? (
                <div className="space-y-2">
                  {versions.map((version) => (
                    <button
                      key={version.id}
                      className={`block w-full rounded-lg border px-2.5 py-2 text-left transition ${theme.docIdle} hover:bg-accent/40`}
                      type="button"
                      onClick={() => {
                        const confirmed = window.confirm(
                          `Restore "${formatVersionLabel(version)}" from ${formatRelativeDate(version.savedAt)}? Unsaved changes will be lost.`,
                        );

                        if (confirmed) {
                          onRestoreVersion(version.id);
                        }
                      }}
                    >
                      <span className="block truncate text-sm font-medium">{formatVersionLabel(version)}</span>
                      <span className={`mt-0.5 block truncate text-[10px] uppercase tracking-[0.12em] ${theme.statusText}`}>
                        {formatRelativeDate(version.savedAt)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}
      </aside>
    </>
  );
}
