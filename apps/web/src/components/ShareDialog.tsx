import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useDastanApp } from '../context/DastanAppProvider';
import type { SharePermission } from '@dastan/plugin-api';
import { addShareContact, getShareContacts, type ShareContact } from '../utils/share-contacts';

interface ShareDialogProps {
  open: boolean;
  title: string;
  documentId?: string;
  onClose: () => void;
  onOpenAddressBook?: () => void;
  onShared?: () => void;
}

export function ShareDialog({ open, title, documentId, onClose, onOpenAddressBook, onShared }: ShareDialogProps) {
  const { share, entitlements } = useDastanApp();
  const cloudSharingAvailable = entitlements.canUseCloudSync();
  const [contacts, setContacts] = useState<ShareContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [permission, setPermission] = useState<SharePermission>('comment');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const shareLink = documentId
    ? share.buildInvite({ documentId, title: title.trim() || 'Untitled Script', permission }).link
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
  }, [open]);

  const selectedContacts = useMemo(
    () => contacts.filter((contact) => selectedIds.includes(contact.id)),
    [contacts, selectedIds],
  );

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="max-w-5xl p-0 sm:max-w-5xl" showCloseButton>
        <DialogHeader className="border-b px-6 py-5">
          <div className="flex items-center gap-3">
            <DialogTitle>Share</DialogTitle>
            <Badge variant="outline">{selectedContacts.length} selected</Badge>
            {!cloudSharingAvailable ? (
              <Badge variant="secondary">Local only</Badge>
            ) : null}
          </div>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>

        {!cloudSharingAvailable ? (
          <div className="border-b bg-muted/40 px-6 py-4 text-sm text-muted-foreground">
            Share links work on this device until cloud sync is enabled. Pro includes cross-device sharing, backups, and real invite links.
          </div>
        ) : null}

        <div className="grid min-h-[68vh] grid-cols-1 md:grid-cols-[1.1fr_0.9fr]">
          <div className="min-h-0 overflow-y-auto border-r p-5">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Contacts</h4>
              <Badge variant="secondary">Address book</Badge>
            </div>

            {contacts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-5 text-sm text-muted-foreground">
                  No contacts yet. Add one below or open Address Book.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {contacts.map((contact) => {
                  const selected = selectedIds.includes(contact.id);

                  return (
                    <label
                      key={contact.id}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-3 transition ${
                        selected ? 'border-emerald-300 bg-emerald-50' : 'border-border bg-card hover:bg-muted/40'
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <p className="truncate text-sm font-medium text-foreground">{contact.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{contact.email}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) => {
                          setSelectedIds((current) => {
                            if (event.target.checked) {
                              return [...current, contact.id];
                            }

                            return current.filter((id) => id !== contact.id);
                          });
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            )}

            <Card className="mt-5">
              <CardHeader>
                <CardTitle>Quick add contact</CardTitle>
                <CardDescription>Add a collaborator without leaving share flow.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <Input placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
                <Input placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      const next = addShareContact({ name, email });
                      setContacts(next);
                      setName('');
                      setEmail('');
                    }}
                  >
                    Add Contact
                  </Button>
                  {onOpenAddressBook ? (
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAddressBook();
                      }}
                    >
                      Open Address Book
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="min-h-0 overflow-y-auto p-5">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>Invite settings</CardTitle>
                  <Badge variant="outline">{permission}</Badge>
                </div>
                <CardDescription>Choose access level and send collaborators a note.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-foreground">Permission</span>
                  <select
                    className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    value={permission}
                    onChange={(event) => setPermission(event.target.value as SharePermission)}
                  >
                    <option value="view">Can view</option>
                    <option value="comment">Can comment</option>
                    <option value="edit">Can edit</option>
                  </select>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-foreground">Note</span>
                  <textarea
                    className="min-h-28 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    placeholder="Add a message for collaborators"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </label>
              </CardContent>
            </Card>

            {shareLink ? (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Share link</CardTitle>
                  <CardDescription>
                    {cloudSharingAvailable
                      ? 'Copy a direct link collaborators can open anywhere.'
                      : 'Copy a direct link to this script on this device.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <Input readOnly value={shareLink} />
                  <Button
                    type="button"
                    onClick={() => {
                      if (!documentId) {
                        return;
                      }

                      void share.copyLink(documentId).then((copied) => {
                        setLinkCopied(copied);
                      });
                    }}
                  >
                    {linkCopied ? 'Copied' : 'Copy link'}
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Recipients</CardTitle>
                <CardDescription>Selected collaborators for this invite.</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedContacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recipients selected.</p>
                ) : (
                  <ul className="space-y-2 text-sm text-foreground">
                    {selectedContacts.map((contact) => (
                      <li key={contact.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                        <span className="min-w-0 truncate">{contact.name} ({contact.email})</span>
                        <Badge variant="secondary">{permission}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {statusMessage ? (
              <p className="mt-4 text-sm text-muted-foreground">{statusMessage}</p>
            ) : null}
          </div>
        </div>

        <DialogFooter className="px-6" showCloseButton={false}>
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={selectedContacts.length === 0 || !documentId}
            onClick={() => {
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
            Send Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
