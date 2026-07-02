import { useMemo, useRef } from 'react';
import { FileText } from 'lucide-react';
import type { ScreenplayDocumentRecord } from '../../types';
import { formatRelativeDate } from '../../utils/hub-utils';
import { formatPageAndRuntime } from '../../utils/runtime-estimate';
import { countPagesFromContent } from '../../utils/screenplay-pagination';
import { getHubTheme } from '../../utils/hub-theme';
import { cn } from '@/lib/utils';
import { ScriptActionsMenu, useScriptContextMenu } from './ScriptActionsMenu';
import type { HubItemActionsMenuHandle } from './HubItemActionsMenu';

interface ScriptCardProps {
  document: ScreenplayDocumentRecord;
  locationLabel: string | null;
  isDark: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onStartRename: () => void;
  onDuplicate: () => void;
  onShare: () => void;
  onMove: () => void;
  onDelete: () => void;
}

function formatPageCountFull(count: number): string {
  return formatPageAndRuntime(count);
}

export function ScriptCard({
  document,
  locationLabel,
  isDark,
  isSelected,
  onSelect,
  onOpen,
  onStartRename,
  onDuplicate,
  onShare,
  onMove,
  onDelete,
}: ScriptCardProps) {
  const hub = getHubTheme(isDark);
  const title = document.title || 'Untitled';
  const genre = document.workspace?.development?.basics?.genre?.trim();
  const logline = document.workspace?.development?.basics?.logline?.trim();
  const menuRef = useRef<HubItemActionsMenuHandle>(null);
  const handleContextMenu = useScriptContextMenu(menuRef);
  const pageCount = useMemo(
    () => countPagesFromContent(document.content),
    [document.id, document.updatedAt],
  );

  return (
    <article
      className={cn(
        'group relative flex cursor-pointer flex-col rounded-xl border p-4 transition',
        isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/25' : hub.card,
      )}
      onClick={onSelect}
      onContextMenu={handleContextMenu}
      onDoubleClick={(event) => {
        event.preventDefault();
        onOpen();
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex items-start justify-between gap-2">
          <span className="inline-flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <FileText size={18} strokeWidth={2} />
          </span>
        </div>
        <h3 className={`truncate text-sm font-semibold ${hub.panelTitle}`}>{title}</h3>
        {genre ? (
          <span className="mt-1.5 inline-block max-w-full truncate rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            {genre}
          </span>
        ) : null}
        {locationLabel ? (
          <p className={`mt-2 truncate text-xs ${hub.panelMuted}`}>{locationLabel}</p>
        ) : null}
        {logline ? (
          <p className={`mt-1 line-clamp-2 text-xs ${hub.panelMuted}`}>{logline}</p>
        ) : null}
        <div className={`mt-auto flex items-center justify-between gap-2 pt-3 text-xs ${hub.panelMuted}`}>
          <span className="tabular-nums">{formatPageCountFull(pageCount)}</span>
          <span className="shrink-0 tabular-nums">{formatRelativeDate(document.updatedAt)}</span>
        </div>
      </div>

      <div
        className="absolute top-3 right-3"
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
      >
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
