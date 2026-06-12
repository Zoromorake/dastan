import { describe, expect, it } from 'vitest';
import { diffPlainText, summarizeDiff } from './version-diff';

describe('version diff', () => {
	it('marks added and removed lines', () => {
		const diff = diffPlainText('INT. ROOM - DAY\nOld line', 'INT. ROOM - DAY\nNew line');
		expect(diff.some((line) => line.type === 'removed' && line.text === 'Old line')).toBe(true);
		expect(diff.some((line) => line.type === 'added' && line.text === 'New line')).toBe(true);
	});

	it('summarizes change counts', () => {
		const diff = diffPlainText('A\nB', 'A\nC');
		expect(summarizeDiff(diff)).toEqual({ added: 1, removed: 1, changed: 2 });
	});
});
