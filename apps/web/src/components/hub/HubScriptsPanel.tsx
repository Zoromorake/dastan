import { LayoutGrid, List } from 'lucide-react';
import type { ScreenplayDocumentRecord, ScreenplayProjectRecord } from '../../types';
import { getHubTheme } from '../../utils/hub-theme';
import { Button } from '@/components/ui/button';
import { ScriptCard } from './ScriptCard';
import { ScriptListItem } from './ScriptListItem';
import type { FileViewMode, ScriptFilter } from './types';

interface HubScriptsPanelProps {
  documents: ScreenplayDocumentRecord[];
  projects: ScreenplayProjectRecord[];
  scriptFilter: ScriptFilter;
  fileViewMode: FileViewMode;
  selectedProject: ScreenplayProjectRecord | null;
  isDark: boolean;
  editingDocumentId: string | null;
  editingTitle: string;
  onScriptFilterChange: (filter: ScriptFilter) => void;
  onFileViewModeChange: (mode: FileViewMode) => void;
  onOpenCreateMenu: () => void;
  onCreateScript: () => void;
  onOpenDocument: (id: string) => void;
  onStartRename: (document: ScreenplayDocumentRecord) => void;
  onCommitRename: (documentId: string) => void;
  onCancelRename: () => void;
  onEditingTitleChange: (value: string) => void;
  onMove: (documentId: string) => void;
  onShare: (document: ScreenplayDocumentRecord) => void;
  onDelete: (documentId: string) => void;
}

export function HubScriptsPanel({
  documents,
  projects,
  scriptFilter,
  fileViewMode,
  selectedProject,
  isDark,
  editingDocumentId,
  editingTitle,
  onScriptFilterChange,
  onFileViewModeChange,
  onOpenCreateMenu,
  onCreateScript,
  onOpenDocument,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onEditingTitleChange,
  onMove,
  onShare,
  onDelete,
}: HubScriptsPanelProps) {
  const hub = getHubTheme(isDark);

  const projectTitleById = new Map(projects.map((project) => [project.id, project.title || 'Untitled project']));

  const filters: Array<{ key: ScriptFilter; label: string }> = [
    { key: 'all', label: 'All scripts' },
    { key: 'unfiled', label: 'Unfiled' },
  ];

  if (selectedProject) {
    filters.push({ key: selectedProject.id, label: selectedProject.title || 'Untitled project' });
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={`text-sm font-medium ${hub.panelTitle}`}>Scripts</h2>
          <p className={`mt-0.5 text-xs ${hub.panelMuted}`}>
            {documents.length} {documents.length === 1 ? 'script' : 'scripts'}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          <button
            aria-label="List view"
            className={`inline-flex size-8 items-center justify-center rounded-md transition ${
              fileViewMode === 'list' ? hub.filterPillActive : hub.filterPill
            }`}
            type="button"
            onClick={() => onFileViewModeChange('list')}
          >
            <List size={16} />
          </button>
          <button
            aria-label="Grid view"
            className={`inline-flex size-8 items-center justify-center rounded-md transition ${
              fileViewMode === 'grid' ? hub.filterPillActive : hub.filterPill
            }`}
            type="button"
            onClick={() => onFileViewModeChange('grid')}
          >
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((filter) => {
          const isActive = scriptFilter === filter.key;

          return (
            <button
              key={filter.key}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                isActive ? hub.filterPillActive : `border border-border ${hub.filterPill}`
              }`}
              type="button"
              onClick={() => onScriptFilterChange(filter.key)}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {documents.length === 0 ? (
        <div className={`rounded-xl border border-dashed p-10 text-center ${hub.dashed}`}>
          <p className={`mb-2 text-base font-semibold ${hub.panelTitle}`}>No scripts yet</p>
          <p className={`mb-5 text-sm ${hub.panelMuted}`}>
            {scriptFilter === 'unfiled'
              ? 'Scripts not in a project will appear here.'
              : selectedProject
                ? 'Create a script inside this project or clear the project filter.'
                : 'Start a blank script or import an existing draft in seconds.'}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" onClick={onCreateScript}>
              New script
            </Button>
            <Button type="button" variant="outline" onClick={onOpenCreateMenu}>
              More options
            </Button>
          </div>
        </div>
      ) : fileViewMode === 'list' ? (
        <div className="space-y-2">
          {documents.map((document) => (
            <ScriptListItem
              key={document.id}
              document={document}
              projectTitle={document.projectId ? (projectTitleById.get(document.projectId) ?? null) : null}
              isDark={isDark}
              isEditing={editingDocumentId === document.id}
              editingTitle={editingTitle}
              onOpen={() => onOpenDocument(document.id)}
              onStartRename={() => onStartRename(document)}
              onCommitRename={() => {
                void onCommitRename(document.id);
              }}
              onCancelRename={onCancelRename}
              onEditingTitleChange={onEditingTitleChange}
              onMove={() => onMove(document.id)}
              onShare={() => onShare(document)}
              onDelete={() => onDelete(document.id)}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {documents.map((document) => (
            <ScriptCard
              key={document.id}
              document={document}
              projectTitle={document.projectId ? (projectTitleById.get(document.projectId) ?? null) : null}
              isDark={isDark}
              onOpen={() => onOpenDocument(document.id)}
              onStartRename={() => onStartRename(document)}
              onMove={() => onMove(document.id)}
              onShare={() => onShare(document)}
              onDelete={() => onDelete(document.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
