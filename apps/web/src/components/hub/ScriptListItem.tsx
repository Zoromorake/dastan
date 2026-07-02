import { useMemo, useRef } from 'react';
import type { ScreenplayDocumentRecord } from '../../types';
import { formatRelativeDate } from '../../utils/hub-utils';
import { formatRuntimeEstimate } from '../../utils/runtime-estimate';
import { countPagesFromContent } from '../../utils/screenplay-pagination';
import { getHubTheme } from '../../utils/hub-theme';
import { cn } from '@/lib/utils';
import { ScriptActionsMenu, useScriptContextMenu } from './ScriptActionsMenu';
import type { HubItemActionsMenuHandle } from './HubItemActionsMenu';

export const SCRIPT_LIST_GRID =
  'grid grid-cols-[minmax(0,1fr)_3.5rem_7rem_2rem] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_4rem_8rem_2rem]';

export const SCRIPT_LIST_GRID_WITH_LOCATION =
  'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_3.5rem_7rem_2rem] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_4rem_8rem_2rem]';

interface ScriptListItemProps {
  document: ScreenplayDocumentRecord;
  locationLabel: string | null;
  showLocationColumn: boolean;
  isDark: boolean;
  isSelected: boolean;
  isEditing: boolean;
  editingTitle: string;
  onSelect: () => void;
  onOpen: () => void;
  onStartRename: () => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onEditingTitleChange: (value: string) => void;
  onDuplicate: () => void;
  onShare: () => void;
  onMove: () => void;
  onDelete: () => void;
}

function formatPageCountAbbrev(count: number): string {
  return `${count}p · ${formatRuntimeEstimate(count)}`;
}

export function ScriptListItem({
  document,
  locationLabel,
  showLocationColumn,
  isDark,
  isSelected,
  isEditing,
  editingTitle,
  onSelect,
  onOpen,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onEditingTitleChange,
  onDuplicate,
  onShare,
  onMove,
  onDelete,
}: ScriptListItemProps) {
  const hub = getHubTheme(isDark);
  const title = document.title || 'Untitled';
  const genre = document.workspace?.development?.basics?.genre?.trim();
  const gridClass = showLocationColumn ? SCRIPT_LIST_GRID_WITH_LOCATION : SCRIPT_LIST_GRID;
  const menuRef = useRef<HubItemActionsMenuHandle>(null);
  const handleContextMenu = useScriptContextMenu(menuRef);
  const pageCount = useMemo(
    () => countPagesFromContent(document.content),
    [document.id, document.updatedAt],
  );

  return (
    <article
      className={cn(
        `group ${gridClass} cursor-pointer px-3 py-2.5 transition`,
        isSelected ? 'bg-primary/5' : 'hover:bg-muted/40',
      )}
      onClick={onSelect}
      onContextMenu={handleContextMenu}
      onDoubleClick={(event) => {
        event.preventDefault();
        onOpen();
      }}
    >
      <div className="flex min-w-0 items-center gap-2">
        {isEditing ? (
          <input
            autoFocus
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            value={editingTitle}
            onClick={(event) => event.stopPropagation()}
            onBlur={() => {
              void onCommitRename();
            }}
            onChange={(event) => onEditingTitleChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void onCommitRename();
              }

              if (event.key === 'Escape') {
                event.preventDefault();
                onCancelRename();
              }
            }}
          />
        ) : (
          <>
            <span className={`min-w-0 truncate text-sm font-medium ${hub.panelTitle}`}>{title}</span>
            {genre ? (
              <span className="shrink-0 rounded-full bg-muted px-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                {genre}
              </span>
            ) : null}
          </>
        )}
      </div>

      {showLocationColumn ? (
        <span className={`truncate text-xs ${hub.panelMuted}`} title={locationLabel ?? undefined}>
          {locationLabel ?? '—'}
        </span>
      ) : null}

      <span className={`text-xs tabular-nums ${hub.panelMuted}`}>{formatPageCountAbbrev(pageCount)}</span>

      <span className={`text-xs tabular-nums ${hub.panelMuted}`}>{formatRelativeDate(document.updatedAt)}</span>

      <div className="flex justify-end" onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}>
        <ScriptActionsMenu
          ref={menuRef}
          title={title}
          onRename={onStartRename}
          onDuplicate={onDuplicate}
          onShare={onShare}
          onMove={onMove}
          onTrash={onDelete}
        />
      </div>
    </article>
  );
}
