export const MENU_WIDTH = 176;
export const MENU_GAP = 4;
export const VIEWPORT_MARGIN = 8;
export const MENU_ESTIMATED_HEIGHT = 132;

export function computeMenuPositionFromAnchor(
  anchorRect: DOMRect,
  menuHeight: number,
  menuWidth = MENU_WIDTH,
): { top: number; left: number } {
  const left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(anchorRect.right - menuWidth, window.innerWidth - menuWidth - VIEWPORT_MARGIN),
  );

  const spaceBelow = window.innerHeight - anchorRect.bottom - MENU_GAP - VIEWPORT_MARGIN;
  const spaceAbove = anchorRect.top - MENU_GAP - VIEWPORT_MARGIN;

  let top: number;

  if (menuHeight <= spaceBelow) {
    top = anchorRect.bottom + MENU_GAP;
  } else if (menuHeight <= spaceAbove) {
    top = anchorRect.top - menuHeight - MENU_GAP;
  } else if (spaceAbove > spaceBelow) {
    top = VIEWPORT_MARGIN;
  } else {
    top = Math.max(VIEWPORT_MARGIN, window.innerHeight - menuHeight - VIEWPORT_MARGIN);
  }

  return { top, left };
}

export function computeMenuPositionFromPoint(
  clientX: number,
  clientY: number,
  menuHeight: number,
  menuWidth = MENU_WIDTH,
): { top: number; left: number } {
  let left = clientX;
  let top = clientY;

  if (left + menuWidth > window.innerWidth - VIEWPORT_MARGIN) {
    left = Math.max(VIEWPORT_MARGIN, clientX - menuWidth);
  }

  if (top + menuHeight > window.innerHeight - VIEWPORT_MARGIN) {
    top = Math.max(VIEWPORT_MARGIN, clientY - menuHeight);
  }

  return { top, left };
}
