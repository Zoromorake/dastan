import { Folder, MoreHorizontal } from 'lucide-react';
import type { ScreenplayProjectRecord } from '../../types';
import { formatRelativeDate } from '../../utils/hub-utils';
import { getHubTheme } from '../../utils/hub-theme';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectCardProps {
  project: ScreenplayProjectRecord;
  itemCount: number;
  lastActivity: string | null;
  isActive: boolean;
  isDark: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
}

export function ProjectCard({
  project,
  itemCount,
  lastActivity,
  isActive,
  isDark,
  onSelect,
  onOpen,
  onEdit,
  onShare,
  onDelete,
}: ProjectCardProps) {
  const hub = getHubTheme(isDark);
  const title = project.title || 'Untitled project';

  return (
    <article
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border transition ${isActive ? hub.cardActive : hub.card}`}
      onClick={onSelect}
      onDoubleClick={(event) => {
        event.preventDefault();
        onOpen();
      }}
    >
      <div className="flex min-h-[5.5rem] items-stretch">
        <div className={`relative w-24 shrink-0 overflow-hidden border-r border-border ${isDark ? 'bg-muted' : 'bg-muted/60'}`}>
          {project.coverImageDataUrl ? (
            <img alt="" className="absolute inset-0 size-full object-cover" src={project.coverImageDataUrl} />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <Folder size={22} strokeWidth={1.5} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 p-3 pr-10">
          <h3 className="truncate text-sm font-semibold" title={title}>
            {title}
          </h3>
          {project.genre ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{project.genre}</p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            {itemCount} {itemCount === 1 ? 'script' : 'scripts'}
            {lastActivity ? ` · Updated ${formatRelativeDate(lastActivity)}` : ''}
          </p>
        </div>
      </div>

      <div className="absolute top-2 right-2 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100" onClick={(event) => event.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={`Actions for ${title}`}
                className="size-7 bg-card/90 backdrop-blur-sm"
                size="icon-sm"
                type="button"
                variant="outline"
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal size={14} />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation();
                onOpen();
              }}
            >
              Open
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
            >
              Edit details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation();
                onShare();
              }}
            >
              Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
