import { useEffect, useMemo, useState } from 'react';
import { Check, Cloud, Copy, Link2, Share2, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useDastanApp } from '../context/DastanAppProvider';
import type { SharePermission } from '@dastan/plugin-api';
import { addShareContact, getShareContacts, type ShareContact } from '../utils/share-contacts';
import { ShareContactRow } from './ShareContactRow';

interface ShareDialogProps {
  open: boolean;
  title: string;
  documentId?: string;
  projectId?: string;
  isDark?: boolean;
  onClose: () => void;
  onOpenAddressBook?: () => void;
  onShared?: () => void;
}

const PERMISSION_OPTIONS: Array<{ value: SharePermission; label: string; description: string }> = [
  { value: 'view', label: 'Can view', description: 'Read the script only' },
  { value: 'comment', label: 'Can comment', description: 'View and leave notes' },
  { value: 'edit', label: 'Can edit', description: 'Full editing access' },
];

export function ShareDialog({ open, title, documentId, projectId, isDark = false, onClose, onOpenAddressBook, onShared }: ShareDialogProps) {
  const { share, entitlements } = useDastanApp();
  const cloudSharingAvailable = entitlements.canUseCloudSync();
  const isFolderShare = !documentId;

  const [contacts, setContacts] = useState<ShareContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [permission, setPermission] = useState<SharePermission>('comment');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const shareLink = documentId
    ? share.buildInvite({
        documentId,
        title: title.trim() || 'Untitled Script',
        permission: cloudSharingAvailable ? permission : 'comment',
      }).link
    : projectId
      ? `${typeof window !== 'undefined' ? window.location.origin : ''}/project/${projectId}`
      : '';

  useEffect(() => {
    if (!open) {
      return;
    }

    setContacts(getShareContacts());
    setSelectedIds([]);
    setPermission('comment');
    setEmail('');
    setName('');
    setNote('');
    setLinkCopied(false);
    setStatusMessage(null);
    setShowQuickAdd(false);
  }, [open]);

  const selectedContacts = useMemo(
    () => contacts.filter((contact) => selectedIds.includes(contact.id)),
    [contacts, selectedIds],
  );

  const toggleContact = (contactId: string, checked: boolean) => {
    setSelectedIds((current) => {
      if (checked) {
        return [...current, contactId];
      }

      return current.filter((id) => id !== contactId);
    });
  };

  const dialogTitle = cloudSharingAvailable
    ? isFolderShare
      ? 'Share folder'
      : 'Share script'
    : isFolderShare
      ? 'Share folder · Preview'
      : 'Share script · Preview';

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-3 border-b px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Share2 size={18} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-base">{dialogTitle}</DialogTitle>
              <DialogDescription className="truncate">{title}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!cloudSharingAvailable ? (
          <>
            <div className="space-y-4 px-5 py-4">
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Cloud size={18} strokeWidth={2} />
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Cloud sharing coming soon</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Real-time collaboration and cross-device invites are in development. For now, you can copy a local link to share this script on this device.
                    </p>
                  </div>
                </div>
              </div>

              {documentId && shareLink ? (
                <section className="space-y-2">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Local link</p>
                  <div className="flex gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Link2
                        aria-hidden
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input readOnly className="h-9 pl-9 text-xs" value={shareLink} />
                    </div>
                    <Button
                      className="shrink-0"
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => {
                        void share.copyLink(documentId).then((copied) => {
                          setLinkCopied(copied);
                        });
                      }}
                    >
                      <Copy size={14} />
                      {linkCopied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </section>
              ) : null}
            </div>

            <DialogFooter className="border-t px-5 py-4" showCloseButton={false}>
              <Button type="button" onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="max-h-[min(70vh,32rem)] space-y-5 overflow-y-auto px-5 py-4">
              <section className="space-y-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Access level</p>
                <div className="grid gap-2">
                  {PERMISSION_OPTIONS.map((option) => {
                    const active = permission === option.value;

                    return (
                      <button
                        key={option.value}
                        className={`rounded-xl border px-3 py-2.5 text-left transition ${
                          active ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-muted/40'
                        }`}
                        type="button"
                        onClick={() => setPermission(option.value)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{option.label}</span>
                          {active ? <Check className="size-4 text-primary" /> : null}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{option.description}</p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {!isFolderShare && shareLink ? (
                <section className="space-y-2">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Link</p>
                  <div className="flex gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Link2
                        aria-hidden
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input readOnly className="h-9 pl-9 text-xs" value={shareLink} />
                    </div>
                    <Button
                      className="shrink-0"
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (documentId) {
                          void share.copyLink(documentId).then((copied) => {
                            setLinkCopied(copied);
                          });
                          return;
                        }

                        if (shareLink) {
                          void navigator.clipboard.writeText(shareLink).then(() => {
                            setLinkCopied(true);
                          });
                        }
                      }}
                    >
                      <Copy size={14} />
                      {linkCopied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </section>
              ) : null}

              {isFolderShare ? (
                <p className="rounded-xl border border-dashed border-border bg-muted/20 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                  Share this project link so collaborators can open the folder. Script-level cloud invites still require backing up each script.
                </p>
              ) : null}

              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">People</p>
                  {selectedContacts.length > 0 ? (
                    <Badge variant="secondary">{selectedContacts.length} selected</Badge>
                  ) : null}
                </div>

                {contacts.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                    No contacts yet. Add someone below.
                  </p>
                ) : (
                  <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                    {contacts.map((contact) => (
                      <ShareContactRow
                        key={contact.id}
                        contact={contact}
                        isDark={isDark}
                        selectable
                        selected={selectedIds.includes(contact.id)}
                        onToggleSelect={toggleContact}
                      />
                    ))}
                  </div>
                )}

                {showQuickAdd ? (
                  <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
                    <Input placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
                    <Input placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        type="button"
                        onClick={() => {
                          const next = addShareContact({ name, email });
                          setContacts(next);
                          setName('');
                          setEmail('');
                          setShowQuickAdd(false);
                        }}
                      >
                        Save contact
                      </Button>
                      <Button size="sm" type="button" variant="ghost" onClick={() => setShowQuickAdd(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" type="button" variant="outline" onClick={() => setShowQuickAdd(true)}>
                      <UserPlus size={14} />
                      Add contact
                    </Button>
                    {onOpenAddressBook ? (
                      <Button size="sm" type="button" variant="ghost" onClick={() => { onClose(); onOpenAddressBook(); }}>
                        Address book
                      </Button>
                    ) : null}
                  </div>
                )}
              </section>

              <section className="space-y-2">
                <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase" htmlFor="share-note">
                  Message <span className="font-normal normal-case">(optional)</span>
                </label>
                <textarea
                  id="share-note"
                  className="min-h-20 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  placeholder="Add a note for collaborators"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </section>

              {statusMessage ? (
                <p className="text-sm text-destructive">{statusMessage}</p>
              ) : null}
            </div>

            <DialogFooter className="border-t px-5 py-4" showCloseButton={false}>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={selectedContacts.length === 0}
                onClick={() => {
                  if (isFolderShare) {
                    const names = selectedContacts.map((contact) => contact.name).join(', ');
                    const inviteText = [
                      `You're invited to collaborate on "${title.trim() || 'Untitled Project'}" on Dastan.`,
                      note.trim() ? `Note: ${note.trim()}` : '',
                      `Open: ${shareLink}`,
                      names ? `For: ${names}` : '',
                    ]
                      .filter(Boolean)
                      .join('\n');

                    void navigator.clipboard.writeText(inviteText).then(() => {
                      setStatusMessage('Project invite copied to clipboard.');
                      onShared?.();
                    });
                    return;
                  }

                  if (!documentId) {
                    return;
                  }

                  const names = selectedContacts.map((contact) => contact.name);

                  void share
                    .sendInvite({
                      documentId,
                      title,
                      permission,
                      recipientNames: names,
                      contactIds: selectedIds,
                      note,
                    })
                    .then((sent) => {
                      if (sent) {
                        onShared?.();
                        onClose();
                        return;
                      }

                      setStatusMessage('Could not copy invite text. Check clipboard permissions and try again.');
                    });
                }}
              >
                Send invite
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
