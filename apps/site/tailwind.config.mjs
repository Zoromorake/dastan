import starlightPlugin from '@astrojs/starlight-tailwind';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
	theme: {
		extend: {
			fontFamily: {
				screenplay: ['"Courier Prime"', 'Courier New', 'monospace'],
				sans: ['Inter', 'system-ui', 'sans-serif'],
			},
			colors: {
				gold: '#c9a227',
				ink: {
					DEFAULT: '#0b1026',
					soft: '#0f1535',
					muted: '#151c3d',
				},
				paper: {
					DEFAULT: '#f4f0e6',
					bright: '#faf7ef',
				},
				revision: {
					blue: '#2563eb',
					pink: '#db2777',
					yellow: '#ca8a04',
					green: '#059669',
					goldenrod: '#b45309',
					white: '#e7e5e4',
				},
			},
		},
	},
	plugins: [starlightPlugin()],
};
