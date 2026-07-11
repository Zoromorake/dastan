/**
 * Automated WCAG AA contrast checks for core theme token pairs.
 * Fails CI/local tests if palette changes drop below 4.5:1 for body text
 * or 3:1 for large/UI chrome pairs we care about.
 */
import { describe, expect, it } from 'vitest';

type Hsl = { h: number; s: number; l: number };

function parseHslToken(token: string): Hsl {
	const [h, s, l] = token.trim().split(/\s+/).map((part, index) => {
		const numeric = Number(part.replace('%', ''));

		if (!Number.isFinite(numeric)) {
			throw new Error(`Invalid HSL token part: ${part}`);
		}

		return index === 0 ? numeric : numeric / 100;
	});

	return { h: h!, s: s!, l: l! };
}

function hslToRgb({ h, s, l }: Hsl): [number, number, number] {
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const hp = h / 60;
	const x = c * (1 - Math.abs((hp % 2) - 1));
	let r = 0;
	let g = 0;
	let b = 0;

	if (hp >= 0 && hp < 1) {
		r = c;
		g = x;
	} else if (hp < 2) {
		r = x;
		g = c;
	} else if (hp < 3) {
		g = c;
		b = x;
	} else if (hp < 4) {
		g = x;
		b = c;
	} else if (hp < 5) {
		r = x;
		b = c;
	} else {
		r = c;
		b = x;
	}

	const m = l - c / 2;
	return [r + m, g + m, b + m].map((channel) => Math.round(channel * 255)) as [number, number, number];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
	const toLinear = (channel: number) => {
		const value = channel / 255;
		return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	};

	const R = toLinear(r);
	const G = toLinear(g);
	const B = toLinear(b);
	return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(foreground: string, background: string): number {
	const L1 = relativeLuminance(hslToRgb(parseHslToken(foreground)));
	const L2 = relativeLuminance(hslToRgb(parseHslToken(background)));
	const lighter = Math.max(L1, L2);
	const darker = Math.min(L1, L2);
	return (lighter + 0.05) / (darker + 0.05);
}

/** Mirrors apps/web/src/styles/index.css :root / .dark semantic tokens. */
const LIGHT = {
	background: '40 20% 97%',
	foreground: '228 20% 12%',
	card: '40 33% 99%',
	'card-foreground': '228 20% 12%',
	muted: '40 16% 92%',
	'muted-foreground': '228 8% 42%',
	primary: '46 67% 47%',
	'primary-foreground': '228 57% 10%',
	paper: '43 33% 93%',
	ink: '228 57% 10%',
} as const;

const DARK = {
	background: '228 57% 10%',
	foreground: '40 6% 91%',
	card: '228 47% 13%',
	'card-foreground': '40 6% 91%',
	muted: '228 44% 15%',
	'muted-foreground': '228 12% 68%',
	primary: '46 67% 47%',
	'primary-foreground': '228 57% 10%',
	paper: '228 40% 16%',
	'paper-bright': '228 36% 18%',
} as const;

describe('theme token WCAG contrast', () => {
	it('keeps light-mode body and card text above AA (4.5:1)', () => {
		expect(contrastRatio(LIGHT.foreground, LIGHT.background)).toBeGreaterThanOrEqual(4.5);
		expect(contrastRatio(LIGHT['card-foreground'], LIGHT.card)).toBeGreaterThanOrEqual(4.5);
		expect(contrastRatio(LIGHT.ink, LIGHT.paper)).toBeGreaterThanOrEqual(4.5);
		expect(contrastRatio(LIGHT['muted-foreground'], LIGHT.background)).toBeGreaterThanOrEqual(4.5);
	});

	it('keeps dark-mode body and card text above AA (4.5:1)', () => {
		expect(contrastRatio(DARK.foreground, DARK.background)).toBeGreaterThanOrEqual(4.5);
		expect(contrastRatio(DARK['card-foreground'], DARK.card)).toBeGreaterThanOrEqual(4.5);
		expect(contrastRatio(DARK.foreground, DARK.paper)).toBeGreaterThanOrEqual(4.5);
		expect(contrastRatio(DARK.foreground, DARK['paper-bright'])).toBeGreaterThanOrEqual(4.5);
		expect(contrastRatio(DARK['muted-foreground'], DARK.background)).toBeGreaterThanOrEqual(4.5);
	});

	it('keeps primary-on-primary-foreground above AA for button labels', () => {
		expect(contrastRatio(LIGHT['primary-foreground'], LIGHT.primary)).toBeGreaterThanOrEqual(4.5);
		expect(contrastRatio(DARK['primary-foreground'], DARK.primary)).toBeGreaterThanOrEqual(4.5);
	});
});
