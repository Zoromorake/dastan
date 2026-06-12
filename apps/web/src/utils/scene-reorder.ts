import type { JSONContent } from '@tiptap/core';

export function splitContentIntoSceneGroups(content: JSONContent): JSONContent[][] {
	const nodes = content.content ?? [];

	if (nodes.length === 0) {
		return [];
	}

	const groups: JSONContent[][] = [];
	let currentGroup: JSONContent[] = [];

	for (const node of nodes) {
		if (node.type === 'scene_heading' && currentGroup.length > 0) {
			groups.push(currentGroup);
			currentGroup = [node];
			continue;
		}

		currentGroup.push(node);
	}

	if (currentGroup.length > 0) {
		groups.push(currentGroup);
	}

	return groups;
}

export function getSceneIndexForBlockIndex(content: JSONContent | null, blockIndex: number): number {
	const groups = splitContentIntoSceneGroups(content ?? { type: 'doc', content: [] });

	let offset = 0;

	for (let sceneIndex = 0; sceneIndex < groups.length; sceneIndex += 1) {
		const groupLength = groups[sceneIndex]?.length ?? 0;

		if (blockIndex < offset + groupLength) {
			return sceneIndex;
		}

		offset += groupLength;
	}

	return Math.max(0, groups.length - 1);
}

export function moveSceneInContent(
	content: JSONContent,
	sceneIndex: number,
	direction: 'up' | 'down',
): JSONContent | null {
	const groups = splitContentIntoSceneGroups(content);
	const swapIndex = direction === 'up' ? sceneIndex - 1 : sceneIndex + 1;

	if (sceneIndex < 0 || sceneIndex >= groups.length || swapIndex < 0 || swapIndex >= groups.length) {
		return null;
	}

	const nextGroups = [...groups];
	const currentGroup = nextGroups[sceneIndex];
	const targetGroup = nextGroups[swapIndex];

	if (!currentGroup || !targetGroup) {
		return null;
	}

	nextGroups[sceneIndex] = targetGroup;
	nextGroups[swapIndex] = currentGroup;

	return {
		...content,
		content: nextGroups.flat(),
	};
}
