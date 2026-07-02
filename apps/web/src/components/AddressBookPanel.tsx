import { useMemo, useState } from 'react';
import { Search, UserPlus, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSettingsTheme } from '../utils/hub-theme';
import {
	addShareContact,
	getShareContacts,
	removeShareContact,
	updateShareContact,
	type ShareContact,
} from '../utils/share-contacts';
import { ShareContactRow } from './ShareContactRow';

interface AddressBookPanelProps {
	isDark: boolean;
}

export function AddressBookPanel({ isDark }: AddressBookPanelProps) {
	const ui = getSettingsTheme(isDark);
	const [contacts, setContacts] = useState<ShareContact[]>(() => getShareContacts());
	const [searchQuery, setSearchQuery] = useState('');
	const [contactName, setContactName] = useState('');
	const [contactEmail, setContactEmail] = useState('');
	const [contactRole, setContactRole] = useState('');
	const [formError, setFormError] = useState<string | null>(null);
	const [editingContact, setEditingContact] = useState<ShareContact | null>(null);

	const filteredContacts = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();

		if (!query) {
			return contacts;
		}

		return contacts.filter(
			(contact) =>
				contact.name.toLowerCase().includes(query) ||
				contact.email.toLowerCase().includes(query) ||
				contact.role?.toLowerCase().includes(query),
		);
	}, [contacts, searchQuery]);

	const resetForm = () => {
		setContactName('');
		setContactEmail('');
		setContactRole('');
		setFormError(null);
		setEditingContact(null);
	};

	const handleSubmit = () => {
		const email = contactEmail.trim().toLowerCase();

		if (!email.includes('@')) {
			setFormError('Enter a valid email address.');
			return;
		}

		if (!contactName.trim()) {
			setFormError('Enter a name for this contact.');
			return;
		}

		if (editingContact) {
			setContacts(
				updateShareContact(editingContact.id, {
					name: contactName,
					email,
					role: contactRole,
				}),
			);
		} else {
			setContacts(
				addShareContact({
					name: contactName,
					email,
					role: contactRole,
				}),
			);
		}

		resetForm();
	};

	const startEdit = (contact: ShareContact) => {
		setEditingContact(contact);
		setContactName(contact.name);
		setContactEmail(contact.email);
		setContactRole(contact.role ?? '');
		setFormError(null);
	};

	return (
		<div className="mx-auto max-w-2xl space-y-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h4 className={`text-base font-semibold ${ui.title}`}>Collaborators</h4>
					<p className={`mt-1 text-sm ${ui.muted}`}>
						Save people once and reuse them when sharing scripts and folders.
					</p>
				</div>
				<Badge variant="outline">{contacts.length} contacts</Badge>
			</div>

			<div className={`rounded-xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-stone-200 bg-stone-50/80'}`}>
				<p className={`mb-3 text-sm font-medium ${ui.label}`}>{editingContact ? 'Edit contact' : 'Add contact'}</p>
				<div className="grid gap-2 sm:grid-cols-3">
					<Input placeholder="Name" value={contactName} onChange={(event) => setContactName(event.target.value)} />
					<Input
						placeholder="Email"
						type="email"
						value={contactEmail}
						onChange={(event) => setContactEmail(event.target.value)}
					/>
					<Input placeholder="Role (optional)" value={contactRole} onChange={(event) => setContactRole(event.target.value)} />
				</div>
				{formError ? <p className="mt-2 text-xs text-red-500">{formError}</p> : null}
				<div className="mt-3 flex flex-wrap gap-2">
					<Button type="button" onClick={handleSubmit}>
						<UserPlus size={14} />
						{editingContact ? 'Save changes' : 'Add contact'}
					</Button>
					{editingContact ? (
						<Button type="button" variant="outline" onClick={resetForm}>
							Cancel
						</Button>
					) : null}
				</div>
			</div>

			<div className="relative">
				<Search
					aria-hidden
					className={`pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 ${ui.muted}`}
				/>
				<Input
					aria-label="Search contacts"
					className="pl-9"
					placeholder="Search contacts…"
					value={searchQuery}
					onChange={(event) => setSearchQuery(event.target.value)}
				/>
			</div>

			{filteredContacts.length === 0 ? (
				<div className={`rounded-xl border border-dashed px-6 py-10 text-center ${isDark ? 'border-slate-700' : 'border-stone-300'}`}>
					<span
						className={`mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-full ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-stone-100 text-stone-500'}`}
					>
						<Users size={22} />
					</span>
					<p className={`text-sm font-medium ${ui.title}`}>
						{contacts.length === 0 ? 'Add your first collaborator' : 'No contacts match your search'}
					</p>
					<p className={`mt-1 text-sm ${ui.muted}`}>
						{contacts.length === 0
							? 'They will appear here and in the share dialog.'
							: 'Try a different name or email.'}
					</p>
				</div>
			) : (
				<div className="space-y-2">
					{filteredContacts.map((contact) => (
						<ShareContactRow
							key={contact.id}
							contact={contact}
							isDark={isDark}
							onEdit={startEdit}
							onRemove={(contactId) => setContacts(removeShareContact(contactId))}
						/>
					))}
				</div>
			)}

			<p className={`text-xs ${ui.muted}`}>
				Contact visibility settings will apply when cloud sync ships.
			</p>
		</div>
	);
}
