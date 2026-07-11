import type { HubFileData } from '../types';

export type HubFilePreviewKind = 'image' | 'pdf' | 'text' | 'audio' | 'video' | 'none';

export function getHubFilePreviewKind(attachment: HubFileData): HubFilePreviewKind {
	const mimeType = attachment.mimeType.toLowerCase();
	const extension = attachment.fileName.split('.').pop()?.toLowerCase() ?? '';

	if (mimeType.startsWith('image/')) {
		return 'image';
	}

	if (mimeType === 'application/pdf' || extension === 'pdf') {
		return 'pdf';
	}

	if (mimeType.startsWith('text/') || mimeType === 'application/json' || extension === 'md' || extension === 'txt') {
		return 'text';
	}

	if (mimeType.startsWith('audio/')) {
		return 'audio';
	}

	if (mimeType.startsWith('video/')) {
		return 'video';
	}

	return 'none';
}

export function canPreviewHubFileAttachment(attachment: HubFileData): boolean {
	return getHubFilePreviewKind(attachment) !== 'none';
}

export async function readHubFileTextContent(attachment: HubFileData): Promise<string> {
	const response = await fetch(attachment.dataUrl);
	return response.text();
}
