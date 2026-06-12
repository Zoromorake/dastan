export interface ShareContact {
  id: string;
  name: string;
  email: string;
  role?: string;
}

const shareContactsStorageKey = 'dastan.share-contacts.v1';

const defaultContacts: ShareContact[] = [
  { id: 'contact-arif', name: 'Arif Qasim', email: 'arifkqasim@gmail.com', role: 'Writer' },
];

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `contact-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export function getShareContacts(): ShareContact[] {
  if (typeof window === 'undefined') {
    return defaultContacts;
  }

  const raw = window.localStorage.getItem(shareContactsStorageKey);

  if (!raw) {
    return defaultContacts;
  }

  try {
    const parsed = JSON.parse(raw) as ShareContact[];

    if (!Array.isArray(parsed)) {
      return defaultContacts;
    }

    return parsed.filter((contact) => typeof contact?.id === 'string' && typeof contact?.email === 'string');
  } catch {
    return defaultContacts;
  }
}

export function saveShareContacts(contacts: ShareContact[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(shareContactsStorageKey, JSON.stringify(contacts));
}

export function addShareContact(input: { name: string; email: string; role?: string }): ShareContact[] {
  const contacts = getShareContacts();
  const normalizedEmail = input.email.trim().toLowerCase();

  if (normalizedEmail.length === 0) {
    return contacts;
  }

  const existing = contacts.find((contact) => contact.email.toLowerCase() === normalizedEmail);

  if (existing) {
    const next = contacts.map((contact) =>
      contact.id === existing.id
        ? {
            ...contact,
            name: input.name.trim() || contact.name,
            role: input.role?.trim() || contact.role,
          }
        : contact,
    );

    saveShareContacts(next);
    return next;
  }

  const next = [
    {
      id: makeId(),
      name: input.name.trim() || normalizedEmail,
      email: normalizedEmail,
      role: input.role?.trim() || undefined,
    },
    ...contacts,
  ];

  saveShareContacts(next);
  return next;
}

export function removeShareContact(id: string): ShareContact[] {
  const next = getShareContacts().filter((contact) => contact.id !== id);
  saveShareContacts(next);
  return next;
}
