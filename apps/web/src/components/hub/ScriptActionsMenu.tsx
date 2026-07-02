import { forwardRef, type RefObject } from 'react';
import { HubItemActionsMenu, type HubItemActionsMenuHandle } from './HubItemActionsMenu';
import type { HubPortalMenuItem } from './HubPortalMenu';

interface ScriptActionsMenuProps {
  title: string;
  onRename: () => void;
  onDuplicate: () => void;
  onShare: () => void;
  onMove: () => void;
  onTrash: () => void;
}

export const ScriptActionsMenu = forwardRef<HubItemActionsMenuHandle, ScriptActionsMenuProps>(
  function ScriptActionsMenu({ title, onRename, onDuplicate, onShare, onMove, onTrash }, ref) {
    const items: HubPortalMenuItem[] = [
      { label: 'Rename', onClick: onRename },
      { label: 'Duplicate', onClick: onDuplicate },
      { label: 'Share', onClick: onShare },
      { label: 'Move to project', onClick: onMove },
      { label: 'Move to trash', onClick: onTrash, destructive: true, separatorBefore: true },
    ];

    return <HubItemActionsMenu ref={ref} title={title} items={items} />;
  },
);

export function useScriptContextMenu(menuRef: RefObject<HubItemActionsMenuHandle | null>) {
  return (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    menuRef.current?.openAtPoint(event.clientX, event.clientY);
  };
}
