import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HubMenuPanel, type HubMenuAnchor } from './HubMenuPanel';
import type { HubPortalMenuItem } from './HubPortalMenu';

export interface HubItemActionsMenuHandle {
  openAtPoint: (x: number, y: number) => void;
}

interface HubItemActionsMenuProps {
  title: string;
  items: HubPortalMenuItem[];
  triggerClassName?: string;
}

export const HubItemActionsMenu = forwardRef<HubItemActionsMenuHandle, HubItemActionsMenuProps>(
  function HubItemActionsMenu({ title, items, triggerClassName }, ref) {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(false);
    const [anchor, setAnchor] = useState<HubMenuAnchor | null>(null);

    const close = () => {
      setOpen(false);
      setAnchor(null);
    };

    const openFromTrigger = () => {
      if (!triggerRef.current) {
        return;
      }

      setAnchor({ type: 'element', element: triggerRef.current });
      setOpen(true);
    };

    useImperativeHandle(ref, () => ({
      openAtPoint: (x: number, y: number) => {
        setAnchor({ type: 'point', x, y });
        setOpen(true);
      },
    }));

    return (
      <>
        <button
          ref={triggerRef}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={`Actions for ${title}`}
          className={cn(
            'inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-70 transition hover:bg-accent hover:text-foreground hover:opacity-100 group-hover:opacity-100',
            triggerClassName,
          )}
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();

            if (open) {
              close();
              return;
            }

            openFromTrigger();
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <MoreHorizontal size={16} />
        </button>

        <HubMenuPanel
          open={open}
          items={items}
          anchor={anchor}
          ignoreCloseWithin={triggerRef.current}
          onClose={close}
        />
      </>
    );
  },
);
