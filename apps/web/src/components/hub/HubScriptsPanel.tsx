import { LayoutGrid, List } from 'lucide-react';
import type { ScreenplayDocumentRecord } from '../../types';
import { getHubTheme } from '../../utils/hub-theme';
import { NewScriptMenu } from './NewScriptMenu';
import type { ScriptTemplate } from '../../utils/user-settings';
import { ScriptCard } from './ScriptCard';
import { SCRIPT_LIST_GRID_WITH_LOCATION, ScriptListItem } from './ScriptListItem';
import type { FileViewMode } from './types';

interface HubScriptsPanelProps {
  documents: ScreenplayDocumentRecord[];
  fileViewMode: FileViewMode;
  isInsideFolder: boolean;
  isDark: boolean;
  editingDocumentId: string | null;
  editingTitle: string;
  selectedLibraryDocumentId: string | null;
  onSelectLibraryDocument: (documentId: string) => void;
  getLocationLabel: (document: ScreenplayDocumentRecord) => string | null;
  onFileViewModeChange: (mode: FileViewMode) => void;
  onStartScratch: () => void;
  onCreateTemplate: (template: ScriptTemplate) => void;
  onImport: (file: File) => void;
  onOpenDocument: (id: string) => void;
  onStartRename: (document: ScreenplayDocumentRecord) => void;
  onCommitRename: (documentId: string) => void;
  onCancelRename: () => void;
  onEditingTitleChange: (value: string) => void;
  onMove: (documentId: string) => void;
  onDuplicate: (documentId: string) => void;
  onShare: (document: ScreenplayDocumentRecord) => void;
  onDelete: (documentId: string) => void;
}

export function HubScriptsPanel({
  documents,
  fileViewMode,
  isInsideFolder,
  isDark,
  editingDocumentId,
  editingTitle,
  selectedLibraryDocumentId,
  onSelectLibraryDocument,
  getLocationLabel,
  onFileViewModeChange,
  onStartScratch,
  onCreateTemplate,
  onImport,
  onOpenDocument,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onEditingTitleChange,
  onMove,
  onDuplicate,
  onShare,
  onDelete,
}: HubScriptsPanelProps) {
  const hub = getHubTheme(isDark);
  const locationHeader = isInsideFolder ? 'Subfolder' : 'Folder';

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={`text-sm font-medium ${hub.panelTitle}`}>Files</h2>
          <p className={`mt-0.5 text-xs ${hub.panelMuted}`}>
            {documents.length} {documents.length === 1 ? 'file' : 'files'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <NewScriptMenu
            isDark={isDark}
            size="sm"
            appearance="outline"
            onStartScratch={onStartScratch}
            onCreateTemplate={onCreateTemplate}
            onImport={onImport}
          />
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
      </div>

      {documents.length === 0 ? (
        <div className={`rounded-xl border border-dashed px-6 py-8 text-center ${hub.dashed}`}>
          <p className={`text-sm ${hub.panelMuted}`}>
            {isInsideFolder ? 'No scripts in this folder yet.' : 'No scripts yet.'}
          </p>
        </div>
      ) : fileViewMode === 'list' ? (
        <div>
          <div
            className={`${SCRIPT_LIST_GRID_WITH_LOCATION} mb-1 border-b border-border px-3 pb-2 text-[10px] font-semibold tracking-[0.14em] uppercase ${hub.panelMuted}`}
          >
            <span>Title</span>
            <span>{locationHeader}</span>
            <span>Pages</span>
            <span>Last modified</span>
            <span className="sr-only">Actions</span>
          </div>

          <div className="divide-y divide-border">
            {documents.map((document) => (
              <ScriptListItem
                key={document.id}
                document={document}
                locationLabel={getLocationLabel(document)}
                showLocationColumn
                isDark={isDark}
                isSelected={selectedLibraryDocumentId === document.id}
                isEditing={editingDocumentId === document.id}
                editingTitle={editingTitle}
                onSelect={() => onSelectLibraryDocument(document.id)}
                onOpen={() => onOpenDocument(document.id)}
                onStartRename={() => onStartRename(document)}
                onCommitRename={() => {
                  void onCommitRename(document.id);
                }}
                onCancelRename={onCancelRename}
                onEditingTitleChange={onEditingTitleChange}
                onMove={() => onMove(document.id)}
                onDuplicate={() => onDuplicate(document.id)}
                onShare={() => onShare(document)}
                onDelete={() => onDelete(document.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {documents.map((document) => (
            <ScriptCard
              key={document.id}
              document={document}
              locationLabel={getLocationLabel(document)}
              isDark={isDark}
              isSelected={selectedLibraryDocumentId === document.id}
              onSelect={() => onSelectLibraryDocument(document.id)}
              onOpen={() => onOpenDocument(document.id)}
              onStartRename={() => onStartRename(document)}
              onMove={() => onMove(document.id)}
              onDuplicate={() => onDuplicate(document.id)}
              onShare={() => onShare(document)}
              onDelete={() => onDelete(document.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
