import { describe, expect, it } from 'vitest';
import {
	buildToolActivityLabel,
	formatToolPreview,
	mapToolPartStateToPreviewStatus,
	markRunningToolsSkipped,
	mergeLiveToolPreviews,
	type ToolPreviewState,
} from './ai-tool-preview';

describe('formatToolPreview', () => {
	it('formats insert_scene with uppercase character cue', () => {
		const preview = formatToolPreview('insert_scene', {
			sceneHeading: 'INT. OFFICE - DAY',
			action: 'A lamp flickers.',
			character: 'mara',
			dialogue: 'Hello?',
		});

		expect(preview.mutatesScript).toBe(true);
		expect(preview.summary).toContain('INT. OFFICE - DAY');
		expect(preview.summary).toContain('MARA');
	});
});

describe('mapToolPartStateToPreviewStatus', () => {
	it('maps streaming input to running and ready input to preview', () => {
		expect(mapToolPartStateToPreviewStatus('input-streaming')).toBe('running');
		expect(mapToolPartStateToPreviewStatus('input-available')).toBe('preview');
		expect(mapToolPartStateToPreviewStatus('output-available')).toBe('preview');
		expect(mapToolPartStateToPreviewStatus('output-error')).toBe('failed');
	});
});

describe('buildToolActivityLabel', () => {
	it('describes preparing and prepared counts', () => {
		const running: ToolPreviewState[] = [
			{
				id: '1',
				toolName: 'insert_scene',
				input: {},
				summary: '',
				mutatesScript: true,
				status: 'preview',
			},
			{
				id: '2',
				toolName: 'insert_scene',
				input: {},
				summary: '',
				mutatesScript: true,
				status: 'running',
			},
		];

		expect(buildToolActivityLabel(running)).toBe('Preparing edit 2 of 2…');
		expect(
			buildToolActivityLabel([
				{ ...running[0]!, status: 'preview' },
				{ ...running[1]!, status: 'preview' },
			]),
		).toBe('2 of 2 edits prepared');
	});
});

describe('mergeLiveToolPreviews', () => {
	it('preserves accepted/rejected decisions across live updates', () => {
		const existing: ToolPreviewState[] = [
			{
				id: 'call_1',
				toolName: 'insert_scene',
				input: { sceneHeading: 'A' },
				summary: 'A',
				mutatesScript: true,
				status: 'accepted',
			},
		];
		const incoming: ToolPreviewState[] = [
			{
				id: 'call_1',
				toolName: 'insert_scene',
				input: { sceneHeading: 'A' },
				summary: 'A',
				mutatesScript: true,
				status: 'preview',
			},
			{
				id: 'call_2',
				toolName: 'rewrite_dialogue',
				input: {},
				summary: '',
				mutatesScript: true,
				status: 'running',
			},
		];

		const merged = mergeLiveToolPreviews(existing, incoming);
		expect(merged[0]?.status).toBe('accepted');
		expect(merged[1]?.status).toBe('running');
	});
});

describe('markRunningToolsSkipped', () => {
	it('marks only running tools as skipped', () => {
		const next = markRunningToolsSkipped([
			{
				id: '1',
				toolName: 'insert_scene',
				input: {},
				summary: '',
				mutatesScript: true,
				status: 'running',
			},
			{
				id: '2',
				toolName: 'insert_scene',
				input: {},
				summary: '',
				mutatesScript: true,
				status: 'preview',
			},
		]);

		expect(next.map((item) => item.status)).toEqual(['skipped', 'preview']);
	});
});
