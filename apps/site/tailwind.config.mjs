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
				ink: {
					DEFAULT: '#0c0b0a',
					soft: '#141210',
					muted: '#1c1916',
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
