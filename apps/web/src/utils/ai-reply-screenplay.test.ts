import { describe, expect, it } from 'vitest';
import {
	looksLikeScreenplayReply,
	parseReplyScreenplayBlocks,
	splitAssistantContent,
} from './ai-reply-screenplay';

describe('looksLikeScreenplayReply', () => {
	it('detects unindented fountain-like replies', () => {
		expect(
			looksLikeScreenplayReply('INT. OFFICE - DAY\n\nA lamp flickers.\n\nMARA\nAnyone there?'),
		).toBe(true);
	});
});

describe('splitAssistantContent', () => {
	it('extracts fenced screenplay blocks', () => {
		const segments = splitAssistantContent(
			'Here is a beat:\n\n```screenplay\nINT. KITCHEN - NIGHT\n\nMARA\nHello.\n```\n\nThoughts?',
		);

		expect(segments.map((segment) => segment.kind)).toEqual(['markdown', 'screenplay', 'markdown']);
		expect(segments[1]?.text).toContain('INT. KITCHEN - NIGHT');
		expect(segments[1]?.text).toContain('MARA');
	});

	it('promotes heuristic screenplay runs when finished', () => {
		const segments = splitAssistantContent(
			'Try this:\n\nINT. OFFICE - DAY\n\nA lamp flickers.\n\nMARA\nAnyone there?\n\nThat keeps tension.',
		);

		expect(segments.map((segment) => segment.kind)).toEqual(['markdown', 'screenplay', 'markdown']);
		expect(segments[1]?.text).toContain('INT. OFFICE - DAY');
		expect(segments[0]?.text).toContain('Try this');
		expect(segments[2]?.text).toContain('That keeps tension');
	});

	it('does not promote an unfinished heuristic run while streaming', () => {
		const segments = splitAssistantContent('INT. OFFICE - DAY\n\nA lamp flickers.\n\nMARA\nAnyone', {
			streaming: true,
		});

		expect(segments.every((segment) => segment.kind === 'markdown')).toBe(true);
	});
});

describe('parseReplyScreenplayBlocks', () => {
	it('returns typed blocks for fountain-like text', () => {
		const blocks = parseReplyScreenplayBlocks('INT. ROOM - DAY\n\nShe waits.\n\nMARA\nHi.');
		expect(blocks.some((block) => block.type === 'scene_heading')).toBe(true);
		expect(blocks.some((block) => block.type === 'character' || block.type === 'dialogue')).toBe(true);
	});
});
