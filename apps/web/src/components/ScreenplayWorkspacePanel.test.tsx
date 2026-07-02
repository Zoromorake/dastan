import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultWorkspaceData } from '../types';
import { ScreenplayWorkspacePanel } from './ScreenplayWorkspacePanel';
import { createStructureBeatsFromTemplate } from '../utils/story-structure';

describe('ScreenplayWorkspacePanel', () => {
	it('renders structure beats and coverage actions', async () => {
		const user = userEvent.setup();
		const workspace = createDefaultWorkspaceData();
		workspace.development.structureTemplate = 'three-act';
		workspace.development.structureBeats = createStructureBeatsFromTemplate('three-act').slice(0, 2);

		const onRequestStructureReview = vi.fn();

		render(
			<ScreenplayWorkspacePanel
				activeTab="structure"
				documentTitle="Test Script"
				scenes={[{ index: 4, text: 'INT. HOUSE - DAY' }]}
				blocks={[]}
				workspace={workspace}
				resolvedTheme="light"
				onTitleChange={() => {}}
				onWorkspaceChange={() => {}}
				onSceneSelect={() => {}}
				onRequestStructureReview={onRequestStructureReview}
			/>,
		);

		expect(screen.getByText('Story Structure')).toBeInTheDocument();
		expect(screen.getByText('Act I — Setup')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Map beats to scenes' })).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Ask AI for coverage' }));

		expect(onRequestStructureReview).toHaveBeenCalledOnce();
		expect(onRequestStructureReview.mock.calls[0]?.[0]).toContain('Coverage score');
	});
});
