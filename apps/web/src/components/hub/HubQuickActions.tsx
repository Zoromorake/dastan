import { useRef } from 'react';
import { FilePlus, FolderPlus, MoreHorizontal, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getHubTheme } from '../../utils/hub-theme';

interface HubQuickActionsProps {
  isDark: boolean;
  onNewScript: () => void;
  onNewProject: () => void;
  onImport: (file: File) => void;
  onCreateTemplate: (template: 'feature' | 'short' | 'tv') => void;
}

export function HubQuickActions({
  isDark,
  onNewScript,
  onNewProject,
  onImport,
  onCreateTemplate,
}: HubQuickActionsProps) {
  const hub = getHubTheme(isDark);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button className="gap-1.5" type="button" onClick={onNewScript}>
        <FilePlus size={16} />
        New script
      </Button>
      <Button className={`gap-1.5 ${hub.ghostButton}`} type="button" variant="outline" onClick={onNewProject}>
        <FolderPlus size={16} />
        New project
      </Button>
      <Button
        className={`gap-1.5 ${hub.ghostButton}`}
        type="button"
        variant="outline"
        onClick={() => uploadInputRef.current?.click()}
      >
        <Upload size={16} />
        Import
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button aria-label="More create options" className={hub.ghostButton} size="icon" type="button" variant="outline">
              <MoreHorizontal size={16} />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Templates</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onCreateTemplate('feature')}>Feature film</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateTemplate('short')}>Short film</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateTemplate('tv')}>TV episode</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Import formats</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => uploadInputRef.current?.click()}>.fountain, .fdx, .txt, .pdf</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={uploadInputRef}
        className="hidden"
        type="file"
        accept=".fountain,.txt,.fdx,.pdf,text/plain,text/xml,application/xml,application/pdf"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            onImport(file);
          }

          event.target.value = '';
        }}
      />
    </div>
  );
}
