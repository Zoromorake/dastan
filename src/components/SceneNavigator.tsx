import type { ScreenplaySceneReference } from '../types';
import type { ScreenplayDocumentRecord } from '../types';
import { getEditorTheme } from '../utils/editor-theme';

interface SceneNavigatorProps {
  collapsed: boolean;
  mode: 'scenes' | 'projects';
  scenes: ScreenplaySceneReference[];
  documentList: ScreenplayDocumentRecord[];
  currentDocumentId: string;
  resolvedTheme: 'light' | 'dark';
  onModeChange: (mode: 'scenes' | 'projects') => void;
  onDocumentSelect: (id: string) => void;
  onDocumentCreate: () => void;
  onDocumentDelete: (id: string) => void;
  onToggleCollapsed: () => void;
  onSceneSelect: (sceneIndex: number) => void;
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

export function SceneNavigator({
  collapsed,
  mode,
  scenes,
  documentList,
  currentDocumentId,
  resolvedTheme,
  onModeChange,
  onDocumentSelect,
  onDocumentCreate,
  onDocumentDelete,
  onToggleCollapsed,
  onSceneSelect,
}: SceneNavigatorProps) {
  const isDark = resolvedTheme === 'dark';
  const theme = getEditorTheme(isDark);
  const modeActiveClass = isDark
    ? 'border-amber-600 bg-amber-900/30 text-slate-100'
    : 'border-amber-300 bg-amber-50 text-stone-900';
  const modeIdleClass = isDark
    ? 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-slate-200'
    : 'border-stone-300 bg-white text-stone-500 hover:border-stone-500 hover:text-stone-900';
  const cardClass = isDark
    ? 'rounded-lg border border-slate-700 bg-slate-800'
    : 'rounded-lg border border-stone-300 bg-white';
  const sceneButtonClass = isDark
    ? 'grid w-full grid-cols-[42px_minmax(0,1fr)] gap-2 rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-left text-slate-300 hover:border-amber-600 hover:bg-slate-700'
    : 'grid w-full grid-cols-[42px_minmax(0,1fr)] gap-2 rounded-lg border border-stone-200 bg-white px-2 py-2 text-left text-stone-700 hover:border-amber-300 hover:bg-amber-50';
  const docActiveClass = isDark ? 'border-amber-600 bg-amber-900/20' : 'border-amber-300 bg-amber-50';
  const docIdleClass = isDark ? 'border-slate-700 bg-slate-800 hover:border-slate-600' : 'border-stone-200 bg-white hover:border-stone-300';

  return (
    <aside
      className={`flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-r transition-all duration-200 ${
        isDark ? 'border-slate-700 bg-slate-800' : 'border-stone-300 bg-[#f6f2ea]'
      } ${collapsed ? 'w-12' : 'w-64'}`}
    >
      <div className={`flex h-11 items-center justify-between border-b px-2 text-xs uppercase tracking-[0.14em] ${isDark ? 'border-slate-700 text-slate-400' : 'border-stone-300 text-stone-500'}`}>
        {!collapsed ? (
          <div className="flex items-center gap-1.5">
            <button
              className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${mode === 'scenes' ? modeActiveClass : modeIdleClass}`}
              type="button"
              onClick={() => onModeChange('scenes')}
            >
              Scenes
            </button>
            <button
              className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${mode === 'projects' ? modeActiveClass : modeIdleClass}`}
              type="button"
              onClick={() => onModeChange('projects')}
            >
              Projects
            </button>
          </div>
        ) : null}
        <button
          className={`ml-auto rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${theme.statusPill}`}
          type="button"
          onClick={onToggleCollapsed}
        >
          {collapsed ? '>' : '<'}
        </button>
      </div>

      {!collapsed && mode === 'scenes' ? (
        <div className={`min-h-0 flex-1 overflow-y-auto p-2 text-sm ${isDark ? 'text-slate-300' : 'text-stone-700'}`}>
          <div className={`mb-2 p-2 ${cardClass}`}>
            <div className={`grid grid-cols-[42px_minmax(0,1fr)] gap-2 text-[10px] uppercase tracking-[0.12em] ${theme.statusText}`}>
              <span>Order</span>
              <span>Script</span>
            </div>
          </div>

          {scenes.length === 0 ? (
            <p className={theme.statusText}>No scenes yet.</p>
          ) : (
            <div className="space-y-2">
              {scenes.map((scene, index) => (
                <button
                  key={`${scene.index}-${index}`}
                  className={sceneButtonClass}
                  type="button"
                  onClick={() => onSceneSelect(scene.index)}
                >
                  <span className={`block truncate text-xs font-medium ${theme.statusText}`}>
                    {index + 1}
                  </span>
                  <span className="block min-w-0">
                    <span className={`block truncate text-[10px] uppercase tracking-[0.12em] ${theme.statusText}`}>Scene</span>
                    <span className="block truncate">{scene.text.length > 0 ? scene.text : 'Untitled Scene'}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : !collapsed && mode === 'projects' ? (
        <div className={`min-h-0 flex-1 overflow-y-auto p-2 text-sm ${isDark ? 'text-slate-300' : 'text-stone-700'}`}>
          <button
            className={`mb-2 block w-full rounded-md border px-2 py-2 text-left text-[10px] uppercase tracking-[0.12em] ${theme.statusPill}`}
            type="button"
            onClick={onDocumentCreate}
          >
            New Script
          </button>

          {documentList.length === 0 ? (
            <p className={theme.statusText}>No scripts yet.</p>
          ) : (
            <div className="space-y-2">
              {documentList.map((document) => {
                const isActive = document.id === currentDocumentId;

                return (
                  <div
                    key={document.id}
                    className={`group relative rounded-lg border ${isActive ? docActiveClass : docIdleClass}`}
                  >
                    <button
                      className={`block w-full rounded-lg px-2 py-2 pr-8 text-left ${isActive ? (isDark ? 'text-slate-100' : 'text-stone-900') : isDark ? 'text-slate-300 hover:text-slate-100' : 'text-stone-700 hover:text-stone-900'}`}
                      type="button"
                      onClick={() => {
                        onDocumentSelect(document.id);
                        onModeChange('scenes');
                      }}
                    >
                      <span className="block truncate">{document.title.length > 0 ? document.title : 'Untitled'}</span>
                      <span className={`block truncate text-[10px] uppercase tracking-[0.12em] ${theme.statusText}`}>
                        {formatRelativeDate(document.updatedAt)}
                      </span>
                    </button>
                    <button
                      aria-label={`Delete ${document.title || 'Untitled'}`}
                      className={`absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100 ${isDark ? 'text-slate-500 hover:text-slate-200' : 'text-stone-400 hover:text-stone-900'}`}
                      type="button"
                      onClick={() => onDocumentDelete(document.id)}
                    >
                      x
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1" />
      )}
    </aside>
  );
}
