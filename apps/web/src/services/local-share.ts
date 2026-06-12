import type { ShareInviteRequest, ShareService } from '@dastan/plugin-api';
import { buildShareInviteText, recordSharedScript } from '../utils/shared-library';

export const localShareService: ShareService = {
	buildInvite(request) {
		const link = `${window.location.origin}/script/${request.documentId}`;
		const text = buildShareInviteText({
			title: request.title.trim() || 'Untitled Script',
			shareLink: link,
			recipientNames: request.recipientNames ?? [],
			permission: request.permission,
			note: request.note,
		});

		return {
			link,
			text,
			requiresCloud: true,
		};
	},
	async sendInvite(request) {
		const invite = this.buildInvite(request);

		try {
			await navigator.clipboard.writeText(invite.text);
			recordSharedScript({
				documentId: request.documentId,
				title: request.title,
				contactIds: request.contactIds ?? [],
				permission: request.permission,
				note: request.note,
			});
			return true;
		} catch {
			return false;
		}
	},
	async copyLink(documentId) {
		const link = `${window.location.origin}/script/${documentId}`;

		try {
			await navigator.clipboard.writeText(link);
			return true;
		} catch {
			return false;
		}
	},
};
