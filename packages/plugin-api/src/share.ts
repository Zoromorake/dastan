export type SharePermission = 'view' | 'comment' | 'edit';

export interface ShareInvite {
	link: string;
	text: string;
	requiresCloud: boolean;
}

export interface ShareInviteRequest {
	documentId: string;
	title: string;
	permission: SharePermission;
	recipientNames?: string[];
	contactIds?: string[];
	note?: string;
}

export interface ShareService {
	buildInvite(request: ShareInviteRequest): ShareInvite;
	sendInvite(request: ShareInviteRequest): Promise<boolean>;
	copyLink(documentId: string): Promise<boolean>;
}
