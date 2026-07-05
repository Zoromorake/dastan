import type { JSONContent } from '@tiptap/core';
import { getSceneHeadingsFromContent, getScreenplayBlocksFromContent } from '@dastan/fountain-parser';

const castCache = new Map<string, Map<number, string[]>>();

function contentCacheKey(content: JSONContent | null): string {
	if (!content?.content) {
		return 'empty';
	}

	return String(content.content.length);
}

export function getSceneCastMap(content: JSONContent | null): Map<number, string[]> {
	const cacheKey = contentCacheKey(content);
	const cached = castCache.get(cacheKey);

	if (cached) {
		return cached;
	}

	const result = new Map<number, string[]>();

	if (!content) {
		return result;
	}

	const headings = getSceneHeadingsFromContent(content);
	const blocks = getScreenplayBlocksFromContent(content);

	headings.forEach((heading, sceneIndex) => {
		const endIndex = headings[sceneIndex + 1]?.index ?? blocks.length;
		const names = new Set<string>();

		for (let index = heading.index; index < endIndex; index += 1) {
			const block = blocks[index];

			if (block?.type === 'character' && block.text.trim()) {
				names.add(block.text.trim().toUpperCase());
			}
		}

		result.set(sceneIndex, [...names].sort());
	});

	castCache.set(cacheKey, result);

	if (castCache.size > 24) {
		const firstKey = castCache.keys().next().value;

		if (firstKey) {
			castCache.delete(firstKey);
		}
	}

	return result;
}

export function getCharactersForScene(content: JSONContent | null, sceneIndex: number): string[] {
	return getSceneCastMap(content).get(sceneIndex) ?? [];
}
