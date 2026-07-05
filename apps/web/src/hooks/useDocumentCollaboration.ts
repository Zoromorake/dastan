import { useEffect, useMemo, useRef, useState } from 'react';
import type { Extensions } from '@tiptap/core';
import type { CollaboratorPresence } from '@dastan/plugin-api';
import { useDastanApp } from '../context/DastanAppProvider';
import { loadPenName } from '../utils/hub-utils';
import {
	mapAwarenessToPeers,
	setupCollaborationEditor,
	type CollaborationBundle,
} from '../collaboration/load-collaboration-bundle';

export interface DocumentCollaborationState {
	isReady: boolean;
	collaborationActive: boolean;
	extensions: Extensions;
	peers: CollaboratorPresence[];
	roomId: string | null;
	bundle: CollaborationBundle | null;
}

export function useDocumentCollaboration(
	documentId: string,
	baseExtensions: Extensions,
): DocumentCollaborationState {
	const { collaboration, auth } = useDastanApp();
	const [peers, setPeers] = useState<CollaboratorPresence[]>([]);
	const [bundle, setBundle] = useState<CollaborationBundle | null>(null);
	const [extensions, setExtensions] = useState<Extensions>(baseExtensions);
	const [isReady, setIsReady] = useState(() => !collaboration.isAvailable());
	const collaborationActive = collaboration.isAvailable();

	const extensionsWithoutHistory = useMemo(
		() => baseExtensions.filter((extension) => extension.name !== 'history'),
		[baseExtensions],
	);

	useEffect(() => {
		if (!collaborationActive) {
			setExtensions((current) => (current === baseExtensions ? current : baseExtensions));
			setBundle((current) => (current === null ? current : null));
			setPeers((current) => (current.length === 0 ? current : []));
			setIsReady((current) => (current ? current : true));
			return;
		}

		let cancelled = false;
		let cleanupBundle: (() => void) | null = null;

		setIsReady(false);

		const room = collaboration.openRoom(documentId);
		const user = auth.getUser();
		const displayName = user?.displayName?.trim() || loadPenName().trim() || 'Writer';

		void setupCollaborationEditor({
			documentId,
			room,
			user: {
				id: user?.id ?? 'local',
				name: displayName,
			},
			excludeHistoryFrom: baseExtensions,
		}).then((nextBundle) => {
			if (cancelled) {
				nextBundle.disconnect();
				return;
			}

			setBundle(nextBundle);
			setExtensions([...extensionsWithoutHistory, ...nextBundle.extensions] as Extensions);
			setIsReady(true);

			const syncPeers = () => {
				setPeers(mapAwarenessToPeers(nextBundle.awareness, user?.id ?? 'local'));
			};

			nextBundle.awareness.on('change', syncPeers);
			syncPeers();

			const unsubscribePeers = room.onPeersChange(setPeers);

			cleanupBundle = () => {
				nextBundle.awareness.off('change', syncPeers);
				unsubscribePeers();
				nextBundle.disconnect();
			};
		});

		return () => {
			cancelled = true;
			cleanupBundle?.();
			collaboration.closeRoom(documentId);
			setBundle(null);
		};
	}, [
		auth,
		baseExtensions,
		collaboration,
		collaborationActive,
		documentId,
		extensionsWithoutHistory,
	]);

	return {
		isReady,
		collaborationActive,
		extensions,
		peers,
		roomId: collaborationActive ? documentId : null,
		bundle,
	};
}
