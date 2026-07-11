import { describe, expect, it } from 'vitest';
import { getHubFilePreviewKind } from './hub-file-preview';

describe('getHubFilePreviewKind', () => {
	it('detects images, pdfs, text, audio, and video', () => {
		expect(
			getHubFilePreviewKind({
				fileName: 'lookbook.png',
				mimeType: 'image/png',
				dataUrl: 'data:image/png;base64,abc',
				byteSize: 10,
			}),
		).toBe('image');

		expect(
			getHubFilePreviewKind({
				fileName: 'notes.pdf',
				mimeType: 'application/octet-stream',
				dataUrl: 'data:application/pdf;base64,abc',
				byteSize: 10,
			}),
		).toBe('pdf');

		expect(
			getHubFilePreviewKind({
				fileName: 'outline.md',
				mimeType: 'text/markdown',
				dataUrl: 'data:text/markdown;base64,YWJj',
				byteSize: 3,
			}),
		).toBe('text');

		expect(
			getHubFilePreviewKind({
				fileName: 'tempo.wav',
				mimeType: 'audio/wav',
				dataUrl: 'data:audio/wav;base64,abc',
				byteSize: 10,
			}),
		).toBe('audio');

		expect(
			getHubFilePreviewKind({
				fileName: 'reel.mp4',
				mimeType: 'video/mp4',
				dataUrl: 'data:video/mp4;base64,abc',
				byteSize: 10,
			}),
		).toBe('video');
	});

	it('returns none for unknown file types', () => {
		expect(
			getHubFilePreviewKind({
				fileName: 'archive.zip',
				mimeType: 'application/zip',
				dataUrl: 'data:application/zip;base64,abc',
				byteSize: 10,
			}),
		).toBe('none');
	});
});
