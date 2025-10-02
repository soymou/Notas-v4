// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightSiteGraph from 'starlight-site-graph'
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import starlightThemeGalaxy from 'starlight-theme-galaxy';

// https://astro.build/config
export default defineConfig({
	markdown: {
		remarkPlugins: [
			remarkMath
		],
		rehypePlugins: [rehypeKatex],
	},
	integrations: [
		starlight({
			plugins: [starlightSiteGraph(), starlightThemeGalaxy()],
			customCss: ['./src/style.css'],
			title: 'Junoy',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/soymou' }],
			sidebar: [
				{
					label: 'Teoría de tipos',
					autogenerate: { directory: 'tipos' },
				},
			],
		}),
	],
	vite: {
		define: {
			process: { env: {} },
		},
	}
});
