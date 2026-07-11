import { describe, expect, it } from 'vitest';
import { extractToolInvocations, extractToolParts } from './ai-tool-executor';

describe('extractToolParts', () => {
	it('parses AI SDK 6 tool-${name} parts without a toolName field', () => {
		const parts = extractToolParts({
			parts: [
				{
					type: 'tool-insert_scene',
					toolCallId: 'call_1',
					state: 'input-streaming',
					input: { sceneHeading: 'INT. ROOM - DAY' },
				},
			],
		});

		expect(parts).toEqual([
			{
				toolCallId: 'call_1',
				toolName: 'insert_scene',
				input: { sceneHeading: 'INT. ROOM - DAY' },
				state: 'input-streaming',
			},
		]);
	});

	it('parses dynamic-tool parts', () => {
		const parts = extractToolParts({
			parts: [
				{
					type: 'dynamic-tool',
					toolName: 'rewrite_dialogue',
					toolCallId: 'call_2',
					state: 'input-available',
					input: { character: 'MARA', newDialogue: 'Hi.' },
				},
			],
		});

		expect(parts[0]?.toolName).toBe('rewrite_dialogue');
		expect(parts[0]?.state).toBe('input-available');
	});

	it('falls back to index-based ids when toolCallId is missing', () => {
		const parts = extractToolParts({
			parts: [
				{ type: 'text', toolName: undefined },
				{
					type: 'tool-update_notes',
					state: 'output-available',
					input: { notes: 'note' },
				},
			],
		});

		expect(parts[0]?.toolCallId).toBe('update_notes-1');
	});
});

describe('extractToolInvocations', () => {
	it('returns stable toolCallIds for finish-path consumers', () => {
		const invocations = extractToolInvocations({
			parts: [
				{
					type: 'tool-insert_scene',
					toolCallId: 'stable-id',
					state: 'output-available',
					input: { sceneHeading: 'EXT. STREET - NIGHT' },
				},
			],
		});

		expect(invocations).toEqual([
			{
				toolName: 'insert_scene',
				input: { sceneHeading: 'EXT. STREET - NIGHT' },
				toolCallId: 'stable-id',
			},
		]);
	});
});
