import type { ScreenplayDocumentRecord } from '../types';
import { canPreviewHubFileAttachment } from './hub-file-preview';

export function isHubScript(document: ScreenplayDocumentRecord): boolean {
	return (document.hubKind ?? 'script') === 'script';
}

export function isHubFile(document: ScreenplayDocumentRecord): boolean {
	return document.hubKind === 'file';
}

export function canPreviewHubFile(document: ScreenplayDocumentRecord): boolean {
	return isHubFile(document) && document.hubFile !== undefined && canPreviewHubFileAttachment(document.hubFile);
}

export function formatHubFileSize(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} B`;
	}

	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(bytes >= 10_240 ? 0 : 1).replace(/\.0$/, '')} KB`;
	}

	return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
}

export function downloadHubFile(document: ScreenplayDocumentRecord): void {
	const attachment = document.hubFile;

	if (!attachment) {
		return;
	}

	const link = window.document.createElement('a');
	link.href = attachment.dataUrl;
	link.download = attachment.fileName;
	window.document.body.appendChild(link);
	link.click();
	link.remove();
}
