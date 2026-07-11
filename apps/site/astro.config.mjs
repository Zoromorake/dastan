import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import starlight from '@astrojs/starlight';
import tailwind from '@astrojs/tailwind';

import cloudflare from "@astrojs/cloudflare";

// DECISION: GitHub Pages vs Vercel — either static host works; interactive HeroEditor is client-side only (no server routes).
export default defineConfig({
    output: 'static',
    site: 'https://dastanapp.com',

    redirects: {
		'/docs': '/getting-started',
		'/docs/getting-started': '/getting-started',
		'/docs/editor': '/editor',
		'/docs/story-tools': '/story-tools',
		'/docs/ai-assistant': '/ai-assistant',
		'/docs/production': '/production',
		'/docs/your-files': '/your-files',
		'/docs/keyboard-shortcuts': '/keyboard-shortcuts',
		'/docs/why-dastan': '/why-dastan',
		'/docs/faq-troubleshooting': '/faq-troubleshooting',
	},

    integrations: [
		react(),
		tailwind({ applyBaseStyles: false }),
		starlight({
			title: 'Dastan',
			description: 'User documentation for Dastan — local-first, open-source screenwriting.',
			logo: { src: './src/assets/logo-mark.svg' },
			customCss: ['./src/styles/starlight.css'],
			components: {
				PageTitle: './src/components/starlight/PageTitle.astro',
			},
			sidebar: [
				{
					label: 'Guides',
					items: [
						{ label: 'Getting started', link: '/docs/getting-started/' },
						{ label: 'The editor', link: '/docs/editor/' },
						{ label: 'Story tools', link: '/docs/story-tools/' },
						{ label: 'AI assistant', link: '/docs/ai-assistant/' },
						{ label: 'Production', link: '/docs/production/' },
						{ label: 'Your files', link: '/docs/your-files/' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'Keyboard shortcuts', link: '/docs/keyboard-shortcuts/' },
						{ label: 'Why Dastan', link: '/docs/why-dastan/' },
						{ label: 'FAQ & troubleshooting', link: '/docs/faq-troubleshooting/' },
					],
				},
			],
			head: [
				{
					tag: 'link',
					attrs: {
						rel: 'stylesheet',
						href: 'https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap',
					},
				},
			],
		}),
	],

    adapter: cloudflare()
});