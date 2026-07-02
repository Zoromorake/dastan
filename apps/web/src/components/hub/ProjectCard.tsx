import { useRef } from 'react';
import { Folder, FolderOpen } from 'lucide-react';
import type { ScreenplayProjectRecord } from '../../types';
import { formatRelativeDate } from '../../utils/hub-utils';
import { cn } from '@/lib/utils';
import { ProjectActionsMenu, useProjectContextMenu } from './ProjectActionsMenu';
import type { HubItemActionsMenuHandle } from './HubItemActionsMenu';

interface ProjectCardProps {
  project: ScreenplayProjectRecord;
  itemCount: number;
  subfolderCount: number;
  lastActivity: string | null;
  isDark: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onOpenFolder: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onShare: () => void;
  onDelete: () => void;
}

export function ProjectCard({
  project,
  itemCount,
  subfolderCount,
  lastActivity,
  isDark,
  isSelected,
  onSelect,
  onOpenFolder,
  onEdit,
  onDuplicate,
  onShare,
  onDelete,
}: ProjectCardProps) {
  const title = project.title || 'Untitled project';
  const menuRef = useRef<HubItemActionsMenuHandle>(null);
  const handleContextMenu = useProjectContextMenu(menuRef);

  return (
    <article
      className={cn(
        'group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition duration-200 hover:shadow-md',
        isSelected
          ? 'border-primary ring-1 ring-primary/35'
          : 'border-border hover:-translate-y-0.5 hover:border-primary/35',
      )}
      onClick={onSelect}
      onContextMenu={handleContextMenu}
      onDoubleClick={(event) => {
        event.preventDefault();
        onOpenFolder();
      }}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-muted/90 via-muted/50 to-background">
        {project.coverImageDataUrl ? (
          <>
            <img
              alt=""
              className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-[1.03]"
              src={project.coverImageDataUrl}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          </>
        ) : (
          <>
            <div
              className={`absolute inset-0 opacity-80 ${isDark ? 'bg-[radial-gradient(circle_at_30%_20%,rgba(251,191,36,0.12),transparent_55%)]' : 'bg-[radial-gradient(circle_at_30%_20%,rgba(217,119,6,0.14),transparent_55%)]'}`}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm backdrop-blur-sm transition duration-200 group-hover:scale-105 group-hover:border-primary/30">
                <Folder className="size-8 text-primary/75" strokeWidth={1.75} />
              </div>
            </div>
          </>
        )}

        <div
          className="absolute top-2.5 right-2.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <ProjectActionsMenu
            ref={menuRef}
            title={title}
            onOpen={onOpenFolder}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onShare={onShare}
            onDelete={onDelete}
          />
        </div>

        <div className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/45 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
          <FolderOpen size={11} strokeWidth={2.25} />
          Folder
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold tracking-tight text-foreground" title={title}>
            {title}
          </h3>
          {project.genre ? (
            <span className="mt-1.5 inline-block max-w-full truncate rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              {project.genre}
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {itemCount} {itemCount === 1 ? 'file' : 'files'}
            {subfolderCount > 0 ? ` · ${subfolderCount} ${subfolderCount === 1 ? 'folder' : 'folders'}` : ''}
          </span>
          {lastActivity ? <span className="shrink-0 tabular-nums">{formatRelativeDate(lastActivity)}</span> : null}
        </div>
      </div>
    </article>
  );
}
