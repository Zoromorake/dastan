import { beforeEach, describe, expect, it } from 'vitest';
import { buildShareInviteText, getSharedScripts, recordSharedScript, removeSharedScript } from './shared-library';

describe('shared library', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it('records and lists shared scripts', () => {
		recordSharedScript({
			documentId: 'doc-1',
			title: 'My Script',
			contactIds: ['contact-a'],
			permission: 'comment',
		});

		expect(getSharedScripts()).toHaveLength(1);
		expect(getSharedScripts()[0]?.documentId).toBe('doc-1');
	});

	it('replaces an existing share for the same document', () => {
		recordSharedScript({
			documentId: 'doc-1',
			title: 'Draft',
			contactIds: ['contact-a'],
			permission: 'view',
		});
		recordSharedScript({
			documentId: 'doc-1',
			title: 'Final Draft',
			contactIds: ['contact-a', 'contact-b'],
			permission: 'edit',
		});

		const entries = getSharedScripts();
		expect(entries).toHaveLength(1);
		expect(entries[0]?.title).toBe('Final Draft');
		expect(entries[0]?.permission).toBe('edit');
		expect(entries[0]?.contactIds).toEqual(['contact-a', 'contact-b']);
	});

	it('removes a shared script entry', () => {
		recordSharedScript({
			documentId: 'doc-1',
			title: 'My Script',
			contactIds: ['contact-a'],
			permission: 'comment',
		});

		removeSharedScript('doc-1');
		expect(getSharedScripts()).toHaveLength(0);
	});

	it('builds invite text with a share link', () => {
		const text = buildShareInviteText({
			title: 'Pilot',
			shareLink: 'https://dastan.test/script/doc-1',
			recipientNames: ['Alex'],
			permission: 'comment',
			note: 'Act 2 feedback',
		});

		expect(text).toContain('Pilot');
		expect(text).toContain('https://dastan.test/script/doc-1');
		expect(text).toContain('Alex');
		expect(text).toContain('Act 2 feedback');
	});
});
