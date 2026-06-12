import { describe, expect, it } from 'vitest';
import { getHubPathForDocument, resolveInitialDocumentId } from './navigation';

describe('navigation helpers', () => {
	it('returns project hub path when document belongs to a project', () => {
		expect(getHubPathForDocument({ projectId: 'project-1' })).toBe('/project/project-1');
	});

	it('returns library root when document is unfiled', () => {
		expect(getHubPathForDocument({ projectId: undefined })).toBe('/');
		expect(getHubPathForDocument(null)).toBe('/');
	});

	it('prefers the URL document id over the last-opened id', () => {
		expect(resolveInitialDocumentId('url-doc', 'last-doc')).toBe('url-doc');
	});

	it('falls back to last-opened id when URL is missing', () => {
		expect(resolveInitialDocumentId(undefined, 'last-doc')).toBe('last-doc');
	});
});
