import { FileText, MoreHorizontal } from 'lucide-react';
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

interface ScriptCardProps {
  document: ScreenplayDocumentRecord;
  projectTitle: string | null;
  isDark: boolean;
  onOpen: () => void;
  onStartRename: () => void;
  onMove: () => void;
  onShare: () => void;
  onDelete: () => void;
}

export function ScriptCard({
  document,
  projectTitle,
  isDark,
  onOpen,
  onStartRename,
  onMove,
  onShare,
  onDelete,
}: ScriptCardProps) {
  const hub = getHubTheme(isDark);
  const title = document.title || 'Untitled';

  return (
    <article className={`group relative flex flex-col rounded-xl border p-4 transition ${hub.card}`}>
      <button className="block w-full text-left" type="button" onClick={onOpen}>
        <div className="mb-3 flex items-start justify-between gap-2">
          <span className="inline-flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <FileText size={18} strokeWidth={2} />
          </span>
        </div>
        <h3 className={`truncate text-sm font-semibold ${hub.panelTitle}`}>{title}</h3>
        <p className={`mt-1 text-xs ${hub.panelMuted}`}>
          {countWordsFromContent(document.content)} words · {formatRelativeDate(document.updatedAt)}
        </p>
        {projectTitle ? (
          <p className={`mt-2 inline-flex rounded-md bg-muted px-2 py-0.5 text-[11px] ${hub.panelMuted}`}>{projectTitle}</p>
        ) : null}
      </button>

      <div className="absolute top-3 right-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={`Actions for ${title}`}
                className="size-8 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 data-popup-open:opacity-100"
                size="icon-sm"
                type="button"
                variant="ghost"
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
      </div>
    </article>
  );
}
