import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HubWelcome } from './HubWelcome';

describe('HubWelcome', () => {
	it('offers new script actions from the welcome panel', () => {
		render(
			<HubWelcome
				isDark={false}
				onStartScratch={vi.fn()}
				onCreateTemplate={vi.fn()}
				onImport={vi.fn()}
				onNewProject={vi.fn()}
			/>,
		);

		expect(screen.getByText('Welcome to your library')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /new script/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument();
	});
});
