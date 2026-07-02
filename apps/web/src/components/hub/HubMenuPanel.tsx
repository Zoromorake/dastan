import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import type { HubPortalMenuItem } from './HubPortalMenu';
import {
  MENU_ESTIMATED_HEIGHT,
  MENU_WIDTH,
  computeMenuPositionFromAnchor,
  computeMenuPositionFromPoint,
} from './hub-menu-utils';

function MenuAction({
  children,
  destructive = false,
  onClick,
}: {
  children: ReactNode;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        'flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm outline-none transition hover:bg-accent hover:text-accent-foreground',
        destructive && 'text-destructive hover:bg-destructive/10 hover:text-destructive',
      )}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export type HubMenuAnchor =
  | { type: 'element'; element: HTMLElement }
  | { type: 'point'; x: number; y: number };

interface HubMenuPanelProps {
  open: boolean;
  items: HubPortalMenuItem[];
  anchor: HubMenuAnchor | null;
  ignoreCloseWithin?: HTMLElement | null;
  onClose: () => void;
}

export function HubMenuPanel({ open, items, anchor, ignoreCloseWithin, onClose }: HubMenuPanelProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !anchor || !menuRef.current) {
      return;
    }

    const menuHeight = menuRef.current.offsetHeight || MENU_ESTIMATED_HEIGHT;

    positionRef.current =
      anchor.type === 'point'
        ? computeMenuPositionFromPoint(anchor.x, anchor.y, menuHeight)
        : computeMenuPositionFromAnchor(anchor.element.getBoundingClientRect(), menuHeight);

    menuRef.current.style.top = `${positionRef.current.top}px`;
    menuRef.current.style.left = `${positionRef.current.left}px`;
  }, [anchor, open, items]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const updatePosition = () => {
      if (!anchor || !menuRef.current) {
        return;
      }

      const menuHeight = menuRef.current.offsetHeight || MENU_ESTIMATED_HEIGHT;
      positionRef.current =
        anchor.type === 'point'
          ? computeMenuPositionFromPoint(anchor.x, anchor.y, menuHeight)
          : computeMenuPositionFromAnchor(anchor.element.getBoundingClientRect(), menuHeight);

      menuRef.current.style.top = `${positionRef.current.top}px`;
      menuRef.current.style.left = `${positionRef.current.left}px`;
    };

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchor, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (menuRef.current?.contains(target) || ignoreCloseWithin?.contains(target)) {
        return;
      }

      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [ignoreCloseWithin, onClose, open]);

  if (!open || !anchor) {
    return null;
  }

  const runAction = (action: () => void) => {
    onClose();
    window.requestAnimationFrame(() => {
      action();
    });
  };

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[200] max-h-[calc(100vh-16px)] overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
      role="menu"
      style={{ top: positionRef.current.top, left: positionRef.current.left, width: MENU_WIDTH }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {items.map((item) => (
        <div key={item.label}>
          {item.separatorBefore ? <div className="my-1 h-px bg-border" /> : null}
          <MenuAction destructive={item.destructive} onClick={() => runAction(item.onClick)}>
            {item.label}
          </MenuAction>
        </div>
      ))}
    </div>,
    document.body,
  );
}
