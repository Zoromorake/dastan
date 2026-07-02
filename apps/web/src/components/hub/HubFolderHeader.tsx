import { Folder, Pencil, Share2 } from 'lucide-react';
import type { ScreenplayProjectRecord } from '../../types';
import { formatRelativeDate } from '../../utils/hub-utils';
import { Button } from '@/components/ui/button';

interface HubFolderHeaderProps {
  project: ScreenplayProjectRecord;
  fileCount: number;
  subfolderCount: number;
  lastActivity: string | null;
  onEditDetails: () => void;
  onShare: () => void;
}

export function HubFolderHeader({
  project,
  fileCount,
  subfolderCount,
  lastActivity,
  onEditDetails,
  onShare,
}: HubFolderHeaderProps) {
  const title = project.title || 'Untitled project';

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-border bg-gradient-to-br from-muted via-muted/60 to-background sm:size-24">
          {project.coverImageDataUrl ? (
            <img alt="" className="size-full object-cover" src={project.coverImageDataUrl} />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Folder className="size-9 text-primary/70" strokeWidth={1.75} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold tracking-tight">{title}</h2>
              {project.genre ? (
                <p className="mt-1 text-sm text-muted-foreground">{project.genre}</p>
              ) : null}
              {project.logline ? (
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{project.logline}</p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Button size="sm" type="button" variant="outline" onClick={onEditDetails}>
                <Pencil size={14} />
                Edit details
              </Button>
              <Button size="sm" type="button" variant="outline" onClick={onShare}>
                <Share2 size={14} />
                Share
              </Button>
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            {fileCount} {fileCount === 1 ? 'file' : 'files'}
            {subfolderCount > 0 ? ` · ${subfolderCount} ${subfolderCount === 1 ? 'subfolder' : 'subfolders'}` : ''}
            {lastActivity ? ` · Updated ${formatRelativeDate(lastActivity)}` : ''}
          </p>
        </div>
      </div>
    </section>
  );
}
