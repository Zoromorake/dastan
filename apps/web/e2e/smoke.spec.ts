import { test, expect } from '@playwright/test';
import fs from 'node:fs';

test.setTimeout(60_000);

test.beforeEach(async ({ context }) => {
	await context.addInitScript(() => {
		window.localStorage.setItem('dastan.local-only-acknowledged', 'true');
	});
});

test('create script, write scene, export fountain', async ({ page }) => {
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	if (!page.url().includes('/script/')) {
		const newScriptButton = page.locator('button:has-text("New script")').first();
		await expect(newScriptButton).toBeVisible({ timeout: 20_000 });
		await newScriptButton.click();
		await expect(page.getByRole('menuitem', { name: 'Start from scratch' })).toBeVisible();
		await Promise.all([
			page.waitForURL(/\/script\//, { timeout: 30_000 }),
			page.getByRole('menuitem', { name: 'Start from scratch' }).click(),
		]);
	}

	const editor = page.locator('.ProseMirror');
	await expect(editor).toBeVisible({ timeout: 20_000 });
	await editor.click();
	await editor.pressSequentially('INT. OFFICE - DAY');
	await editor.press('Enter');
	await editor.pressSequentially('A phone rings on the desk.');

	const downloadPromise = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Script actions' }).click();
	await page.getByRole('menuitem', { name: 'Fountain (.fountain)' }).click();
	const download = await downloadPromise;

	const filePath = await download.path();

	expect(filePath).toBeTruthy();

	const contents = fs.readFileSync(filePath!, 'utf8');
	expect(contents).toContain('INT. OFFICE - DAY');
	expect(contents).toContain('A phone rings on the desk.');
});
