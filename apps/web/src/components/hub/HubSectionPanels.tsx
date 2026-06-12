import { Button } from '@/components/ui/button';
import type { ScreenplayDocumentRecord } from '../../types';
import { formatRelativeDate } from '../../utils/hub-utils';
import { getHubTheme } from '../../utils/hub-theme';
import type { ShareContact } from '../../utils/share-contacts';
import type { SharedScriptEntry } from '../../utils/shared-library';
import type { SettingsTab } from '../UserSettingsPanel';

interface HubSharedPanelProps {
  sharedEntries: SharedScriptEntry[];
  documents: ScreenplayDocumentRecord[];
  contacts: ShareContact[];
  isDark: boolean;
  onOpenDocument: (documentId: string) => void;
  onRemoveShared: (documentId: string) => void;
  onOpenAddressBook: () => void;
}

export function HubSharedPanel({
  sharedEntries,
  documents,
  contacts,
  isDark,
  onOpenDocument,
  onRemoveShared,
  onOpenAddressBook,
}: HubSharedPanelProps) {
  const hub = getHubTheme(isDark);
  const documentMap = new Map(documents.map((document) => [document.id, document]));

  return (
    <section>
      <h2 className={`mb-1 text-lg font-semibold ${hub.panelTitle}`}>Shared</h2>
      <p className={`mb-6 max-w-2xl text-sm ${hub.panelMuted}`}>
        Scripts you have shared locally appear here with their recipients and permissions. Copy invite links from Share on any script to collaborate on this device or network.
      </p>

      {sharedEntries.length === 0 ? (
        <div className={`rounded-xl border border-dashed p-12 text-center ${hub.dashed}`}>
          <p className={`mb-2 text-base font-semibold ${hub.panelTitle}`}>Nothing shared yet</p>
          <p className={`mb-4 text-sm ${hub.panelMuted}`}>
            Open a script, choose Share, select contacts, and send an invite to add it here.
          </p>
          <Button type="button" variant="outline" onClick={onOpenAddressBook}>
            Open address book
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {sharedEntries.map((entry) => {
            const document = documentMap.get(entry.documentId);
            const title = document?.title || entry.title || 'Untitled';
            const recipients = entry.contactIds
              .map((contactId) => contacts.find((contact) => contact.id === contactId))
              .filter((contact): contact is ShareContact => contact !== undefined);

            return (
              <article key={entry.documentId} className={`rounded-xl border px-4 py-3 ${hub.card}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <button
                      className={`truncate text-left text-sm font-semibold hover:underline ${hub.panelTitle}`}
                      type="button"
                      onClick={() => onOpenDocument(entry.documentId)}
                    >
                      {title}
                    </button>
                    <p className={`mt-1 text-xs ${hub.panelMuted}`}>
                      Shared {formatRelativeDate(entry.sharedAt)} · {entry.permission} access
                    </p>
                    {recipients.length > 0 ? (
                      <p className={`mt-2 text-xs ${hub.panelMuted}`}>
                        {recipients.map((contact) => contact.name).join(', ')}
                      </p>
                    ) : (
                      <p className={`mt-2 text-xs ${hub.panelMuted}`}>Recipients removed from address book</p>
                    )}
                    {entry.note ? <p className={`mt-2 text-sm ${hub.panelMuted}`}>{entry.note}</p> : null}
                    {!document ? (
                      <p className={`mt-2 text-xs text-amber-700 dark:text-amber-300`}>Original script is no longer in your library.</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {document ? (
                      <Button size="sm" type="button" onClick={() => onOpenDocument(entry.documentId)}>
                        Open
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => {
                        onRemoveShared(entry.documentId);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

interface HubTrashPanelProps {
  documents: ScreenplayDocumentRecord[];
  isDark: boolean;
  onRestore: (id: string) => void;
  onDeleteForever: (id: string) => void;
}

export function HubTrashPanel({ documents, isDark, onRestore, onDeleteForever }: HubTrashPanelProps) {
  const hub = getHubTheme(isDark);

  return (
    <section>
      <h2 className={`mb-1 text-lg font-semibold ${hub.panelTitle}`}>Trash</h2>
      <p className={`mb-6 text-sm ${hub.panelMuted}`}>Deleted scripts stay here for 30 days, then are removed automatically.</p>

      {documents.length === 0 ? (
        <div className={`rounded-xl border border-dashed p-12 text-center ${hub.dashed}`}>
          <p className={`mb-2 text-base font-semibold ${hub.panelTitle}`}>Trash is empty</p>
          <p className={`text-sm ${hub.panelMuted}`}>Scripts you delete from the library appear here until restored or permanently removed.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((document) => (
            <article key={document.id} className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${hub.card}`}>
              <div className="min-w-0">
                <h3 className={`truncate text-sm font-semibold ${hub.panelTitle}`}>{document.title || 'Untitled'}</h3>
                <p className={`mt-1 text-xs ${hub.panelMuted}`}>
                  Deleted {document.deletedAt ? formatRelativeDate(document.deletedAt) : 'recently'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void onRestore(document.id);
                  }}
                >
                  Restore
                </Button>
                <Button size="sm" type="button" variant="destructive" onClick={() => onDeleteForever(document.id)}>
                  Delete forever
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

interface HubLoadingSkeletonProps {
  isDark: boolean;
}

export function HubLoadingSkeleton({ isDark }: HubLoadingSkeletonProps) {
  const hub = getHubTheme(isDark);

  return (
    <div className={`flex h-screen ${hub.shell} ${isDark ? 'dark' : ''}`}>
      <div className={`hidden w-[12.5rem] shrink-0 p-4 md:block ${hub.sidebar}`}>
        <div className="mb-8 h-11 w-28 animate-pulse rounded-lg bg-black/10" />
        <div className="space-y-4">
          <div className="h-10 animate-pulse rounded-lg bg-black/10" />
          <div className="h-10 animate-pulse rounded-lg bg-black/10" />
          <div className="h-10 animate-pulse rounded-lg bg-black/10" />
        </div>
      </div>
      <div className="flex-1 p-6">
        <div className="mb-6 h-8 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="mb-8 flex gap-2">
          <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="h-28 animate-pulse rounded-xl bg-muted" />
          <div className="h-28 animate-pulse rounded-xl bg-muted" />
          <div className="h-28 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}

export type { SettingsTab };
