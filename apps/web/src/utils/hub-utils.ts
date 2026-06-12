const userSettingsStorageKey = 'dastan.user-settings.v1';

export function formatRelativeDate(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  if (diffMs < dayMs) {
    const hours = Math.max(1, Math.floor(diffMs / hourMs));
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  if (diffMs < dayMs * 2) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function loadPenName(): string {
  if (typeof window === 'undefined') {
    return 'Writer';
  }

  const raw = window.localStorage.getItem(userSettingsStorageKey);

  if (!raw) {
    return 'Writer';
  }

  try {
    const parsed = JSON.parse(raw) as { penName?: string };
    return parsed.penName?.trim() || 'Writer';
  } catch {
    return 'Writer';
  }
}

export function loadProfileImage(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(userSettingsStorageKey);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { profileImageDataUrl?: string | null };
    return parsed.profileImageDataUrl ?? null;
  } catch {
    return null;
  }
}

export function getTimeGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 17) {
    return 'Good afternoon';
  }

  return 'Good evening';
}
