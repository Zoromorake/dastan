import { forwardRef, type RefObject } from 'react';
import { HubItemActionsMenu, type HubItemActionsMenuHandle } from './HubItemActionsMenu';
import type { HubPortalMenuItem } from './HubPortalMenu';

interface ProjectActionsMenuProps {
  title: string;
  onOpen: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onShare: () => void;
  onDelete: () => void;
}

export const ProjectActionsMenu = forwardRef<HubItemActionsMenuHandle, ProjectActionsMenuProps>(
  function ProjectActionsMenu({ title, onOpen, onEdit, onDuplicate, onShare, onDelete }, ref) {
    const items: HubPortalMenuItem[] = [
      { label: 'Open', onClick: onOpen },
      { label: 'Edit details', onClick: onEdit },
      { label: 'Duplicate', onClick: onDuplicate },
      { label: 'Share', onClick: onShare },
      { label: 'Move to trash', onClick: onDelete, destructive: true, separatorBefore: true },
    ];

    return (
      <HubItemActionsMenu
        ref={ref}
        title={title}
        items={items}
        triggerClassName="size-7 bg-card/90 opacity-100 backdrop-blur-sm group-hover:opacity-100"
      />
    );
  },
);

export function useProjectContextMenu(menuRef: RefObject<HubItemActionsMenuHandle | null>) {
  return (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    menuRef.current?.openAtPoint(event.clientX, event.clientY);
  };
}
