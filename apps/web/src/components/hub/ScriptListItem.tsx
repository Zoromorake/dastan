import { MoreHorizontal } from 'lucide-react';
import type { ScreenplayDocumentRecord } from '../../types';
import { formatRelativeDate } from '../../utils/hub-utils';
import { countWordsFromContent } from '../../utils/screenplay-text';
import { getHubTheme } from '../../utils/hub-theme';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ScriptListItemProps {
  document: ScreenplayDocumentRecord;
  projectTitle: string | null;
  isDark: boolean;
  isEditing: boolean;
  editingTitle: string;
  onOpen: () => void;
  onStartRename: () => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onEditingTitleChange: (value: string) => void;
  onMove: () => void;
  onShare: () => void;
  onDelete: () => void;
}

export function ScriptListItem({
  document,
  projectTitle,
  isDark,
  isEditing,
  editingTitle,
  onOpen,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onEditingTitleChange,
  onMove,
  onShare,
  onDelete,
}: ScriptListItemProps) {
  const hub = getHubTheme(isDark);
  const title = document.title || 'Untitled';

  return (
    <article className={`group flex items-center gap-3 rounded-xl border px-4 py-3 transition ${hub.card}`}>
      <button className="min-w-0 flex-1 text-left" type="button" onClick={onOpen}>
        {isEditing ? (
          <input
            autoFocus
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            value={editingTitle}
            onBlur={() => {
              void onCommitRename();
            }}
            onChange={(event) => onEditingTitleChange(event.target.value)}
            onClick={(event) => event.stopPropagation()}
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
          <h3 className={`truncate text-sm font-semibold ${hub.panelTitle}`}>{title}</h3>
        )}
        <p className={`mt-1 text-xs ${hub.panelMuted}`}>
          {countWordsFromContent(document.content)} words · Updated {formatRelativeDate(document.updatedAt)}
          {projectTitle ? ` · ${projectTitle}` : ''}
        </p>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={`Actions for ${title}`}
              className="size-8 shrink-0 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 data-popup-open:opacity-100"
              size="icon-sm"
              type="button"
              variant="ghost"
              onClick={(event) => event.stopPropagation()}
            >
              <MoreHorizontal size={16} />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={onOpen}>Open</DropdownMenuItem>
          <DropdownMenuItem onClick={onStartRename}>Rename</DropdownMenuItem>
          <DropdownMenuItem onClick={onMove}>Move to project</DropdownMenuItem>
          <DropdownMenuItem onClick={onShare}>Share</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </article>
  );
}
